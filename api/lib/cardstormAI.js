// cardstormAI.analyze(...) - the single adapter the rest of the backend
// talks to. Everything Claude-specific (model ids, tool wiring, system
// prompt) lives here so the provider can be swapped later without touching
// api/cardstorm.js.
//
// Model IDs verified current for this account/environment as of this build
// (this environment's own model directory + the bundled claude-api skill
// docs - not guessed): both models below support native image understanding
// in the same request as text (no separate vision credential/service) and
// the server-side "web_search_20260209" tool.
const Anthropic = require("@anthropic-ai/sdk");
const cardstormData = require("./cardstormData");

// Fast path: general hobby knowledge, CardStorm-internal-data-backed
// answers (verified comps, checklist/product grounding), simple image
// identification. Picked for latency/cost - Sonnet 5 is the current
// mid-tier Claude 5 model with full vision + tool support.
const MODEL_FAST = "claude-sonnet-5";
// Stronger path: live web research (tool-use reasoning over search results)
// and anything image-based, where identification mistakes are the exact
// failure mode this build must avoid fabricating past.
const MODEL_STRONG = "claude-opus-5";
// Kept for any external caller (tests, logging) that wants "the default
// model" without caring about the routing rule below.
const MODEL_ID = MODEL_STRONG;

// A model call is aborted client-side this many ms before Vercel's own
// function maxDuration would kill the whole invocation, so OUR code gets to
// return a clean, honest JSON error instead of the platform's raw
// FUNCTION_INVOCATION_TIMEOUT page ever reaching the user.
const MODEL_CALL_TIMEOUT_MS = 55_000;

function getClient() {
  const apiKey = process.env.CARDSTORM_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Model-routing rule, kept in code (not just a prompt) per the routing
// priority: verified internal data and simple general knowledge don't need
// the strongest/slowest model; live research and any image do.
function chooseModel({ hasImages, needsResearch }) {
  if (hasImages) return MODEL_STRONG;
  if (needsResearch) return MODEL_STRONG;
  return MODEL_FAST;
}

// The model is asked to end every answer with one trailing line of JSON so
// the backend can extract structured fields without guessing at an
// unverified "structured output" API shape - this is plain prompting +
// server-side parsing, which works with the plain Messages API used here.
// CARDSTORM_JSON_MARKER must never appear in normal answer text.
const CARDSTORM_JSON_MARKER = "<<CARDSTORM_DATA>>";

const SYSTEM_PROMPT = `You are the answer engine behind "Ask CardStorm" inside the CardStorm sports-card app. You talk like an experienced, sharp sports-card collector giving a direct answer to another collector - not like an encyclopedia and not like a generic AI assistant.

LENGTH - keep the visible answer tight by default: a short direct answer, then at most 3-5 short bullets or a couple of short paragraphs. Do not write a long essay for a simple question ("What makes Downtown inserts valuable?" needs a few sharp points, not a treatise). Only go longer when the question explicitly asks for depth or the evidence genuinely requires it (e.g. listing several distinct verified comps). You have a hard output budget shared with the required JSON line at the end of your response - a long visible answer that leaves no room for that JSON is a failure, so stop the visible answer while you still have plenty of room left, then always emit the JSON line.

ROUTING PRIORITY - use the highest-priority source that actually applies, and say so honestly when none do:
1. CARDSTORM_VERIFIED_DATA passed to you in this request - this includes CardStorm's own verified sold comps (verifiedComps), curated-but-unverified chase suggestions (curatedChases - never call these "verified"), on-disk checklist/product records, and productKnowledge (manufacturer/brand/insert identity facts). Treat verifiedComps, checklist/product records, and productKnowledge as ground truth. If this data already answers the question, use it and do not treat the question as needing live research even if it sounds current.
2. Verified current external research via the web_search tool (only available to you when the backend decided this question genuinely needs fresh information or an unfamiliar product/insert identity - if the tool isn't in this request, don't ask for it, just answer from what you have) - cite what you found, preferring the manufacturer's own site/press materials over hobby blogs when both are available.
3. Direct interpretation of any image(s) provided.
4. Your own general sports-card knowledge (product history, insert mechanics, grading concepts, market dynamics in general terms).
5. If none of the above actually supports an answer, say so honestly instead of guessing.

PRODUCT / INSERT / MANUFACTURER IDENTITY - this is a common failure mode, be careful here. If CARDSTORM_VERIFIED_DATA.productKnowledge names an insert's or brand's manufacturer, that is ground truth - never contradict it (for example, if productKnowledge says an insert's manufacturer is "Panini", never call it a Topps product, and vice versa). If a question asks "what product/set/box is X in" or "is X a Topps/Panini product" and X is NOT in productKnowledge, do not guess confidently from memory - use web_search if it's available to you for this request, and if it isn't, say plainly that you're not certain which manufacturer/product that is rather than stating a guess as fact.

ABSOLUTE RULE ON SOLD COMPS AND PRICES - this is the most important rule you follow. For a sold-comp/price question, your priority is exactly:
  1. CARDSTORM_VERIFIED_DATA.verifiedComps for that player/card, if present - use these first and only these when they exist.
  2. A clearly completed/sold transaction you found via web_search (never an active listing, never an asking price, never a "similar card sold for around..." guess).
  3. If neither exists, say plainly that CardStorm doesn't have a verified comp for it yet - you may still discuss rarity/desirability in general terms, but never attach a number to it.
Never invent, estimate, or state a specific sold price/value that isn't backed by one of the two sources above. Never present an active/unsold marketplace listing as if it were a sale. Never upgrade a curatedChases entry into a claimed sale or verified fact.

GRADING - never claim a specific numeric grade a card would receive (never say "this will grade a 10"). Only use: STRONG GRADING CANDIDATE, BORDERLINE, WEAK GRADING CANDIDATE, or UNABLE TO DETERMINE FROM PHOTO, each with the visible reasoning (centering, corners, edges, surface) and a note that photos have real limitations (glare, resolution, one angle) compared to an in-hand review.

IMAGE CLASSIFICATION - when an image is provided, first silently classify it as one of: CARD_SINGLE, CARD_FRONT_BACK, MULTIPLE_CARDS, BREAK_SCREENSHOT, BREAK_PRICING, RETAIL_SHELF, CARD_SHOP_SHELF, PRODUCT_BOX, MARKETPLACE_LISTING, SOLD_COMP_SCREENSHOT, CHECKLIST_IMAGE, or UNKNOWN_CARD_CONTENT, then answer appropriately for that category. For a card image, attempt to read: sport, player, team, year, manufacturer/product/set, card number, rookie logo, insert/parallel name, serial numbering, autograph/memorabilia, grading company + grade if slabbed, and any other visible text. State your confidence honestly - use a percentage or "LIKELY MATCH", or give a short numbered "POSSIBLE MATCHES" list when you're not confident of one exact identification. Never state an identification as certain when it isn't.

VERDICT FORMAT - when you have enough evidence, you may end an answer with a short block like:
CARDSTORM TAKE: BUY / FAIR / PASS / HOLD (one line reason)
Only include this when your evidence actually supports a take - omit it otherwise.

HONESTY OVER COMPLETENESS - a correct "I don't know / CardStorm doesn't have that verified yet, here's what would help" is always better than a fabricated answer. Never invent a card's existence, a set's checklist, a population count, or a rarity number.

Respond in HTML-safe plain text with <br> for line breaks and <b> for emphasis (this is inserted directly into a chat bubble) - no markdown headers, no code fences.

After your answer, on its own final line, append exactly ${CARDSTORM_JSON_MARKER} followed immediately by one single-line JSON object (no markdown fences) with this exact shape - use null or [] for anything not supported by what you actually found, never fabricate a value to fill a field:
${CARDSTORM_JSON_MARKER}{"contentType":"CARD_SINGLE|CARD_FRONT_BACK|MULTIPLE_CARDS|BREAK_SCREENSHOT|BREAK_PRICING|RETAIL_SHELF|CARD_SHOP_SHELF|PRODUCT_BOX|MARKETPLACE_LISTING|SOLD_COMP_SCREENSHOT|CHECKLIST_IMAGE|UNKNOWN_CARD_CONTENT|null","confidence":"0-100 number or a short label like LIKELY MATCH, or null","identifiedCards":[],"identifiedProducts":[],"identifiedPlayers":[],"identifiedTeams":[],"identifiedSets":[],"rarityGuidance":"string or null","gradingGuidance":"STRONG GRADING CANDIDATE|BORDERLINE|WEAK GRADING CANDIDATE|UNABLE TO DETERMINE FROM PHOTO|null","suggestedFollowups":[],"warnings":[]}
This JSON line is stripped before the answer is shown to the user, so it never needs to look natural - just be accurate and valid JSON.`;

function buildUserContent({ question, images, groundedData }) {
  const content = [];
  if (images.front) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: images.front.mediaType, data: images.front.base64 },
    });
  }
  if (images.back) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: images.back.mediaType, data: images.back.base64 },
    });
  }
  if (images.general) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: images.general.mediaType, data: images.general.base64 },
    });
  }

  let text = "";
  const hasGrounding =
    groundedData &&
    (groundedData.matchedCards.length ||
      groundedData.matchedProducts.length ||
      groundedData.matchedComps.length ||
      groundedData.matchedChases.length ||
      groundedData.matchedInserts.length ||
      groundedData.matchedBrands.length);
  if (hasGrounding) {
    text += `CARDSTORM_VERIFIED_DATA (on-disk, ground truth - not from you or the internet):\n${JSON.stringify(
      {
        verifiedComps: groundedData.matchedComps,
        verifiedCompsSchema: "[player, price, cardDescription, grade, saleDate, source, verifyUrl]",
        curatedChases: groundedData.matchedChases,
        curatedChasesSchema: "[player, sport, hit1, hit2, hit3] - editorial suggestions, NOT verified sales/checklist facts",
        checklistCards: groundedData.matchedCards,
        products: groundedData.matchedProducts,
        productKnowledge: {
          insertsNamedInQuestion: groundedData.matchedInserts,
          brandsNamedInQuestion: groundedData.matchedBrands,
        },
      }
    )}\n\n`;
  }
  if (images.front || images.back) {
    text += "The images above are the front and/or back of a physical card the collector is holding.\n";
  } else if (images.general) {
    text += "The image above is a general photo/screenshot (could be retail shelf, a listing, a break screenshot, multiple cards, etc).\n";
  }
  text += question || "What can you tell me about the image(s) above?";
  content.push({ type: "text", text });
  return content;
}

// Deterministic factual-conflict guard: if the model's answer confidently
// attributes a grounded insert to the WRONG manufacturer (the exact "Downtown
// is a Topps insert" failure this was built to catch), don't try to patch
// the model's prose - discard it and substitute a plain answer built
// directly from the grounded fact, so correctness never depends on the
// model reliably obeying the prompt. Internal verified data always wins.
const KNOWN_MANUFACTURERS = ["Panini", "Topps"];
function detectManufacturerConflict(answerText, groundedData) {
  if (!groundedData || !groundedData.matchedInserts || !groundedData.matchedInserts.length) return null;
  const lower = (answerText || "").toLowerCase();
  for (const insert of groundedData.matchedInserts) {
    const truth = insert.manufacturer;
    const truthMentioned = new RegExp(`\\b${truth}\\b`, "i").test(lower);
    if (truthMentioned) continue; // answer already agrees with ground truth
    for (const wrong of KNOWN_MANUFACTURERS) {
      if (wrong === truth) continue;
      // Conservative: only flag when the wrong manufacturer is mentioned
      // close to the insert's own name (avoids false positives from an
      // unrelated sentence about the other manufacturer elsewhere).
      const proximityPattern = new RegExp(
        `\\b${wrong}\\b[^.]{0,60}\\b${insert.name}\\b|\\b${insert.name}\\b[^.]{0,60}\\b${wrong}\\b`,
        "i"
      );
      if (proximityPattern.test(answerText)) {
        return { insert, wrongManufacturer: wrong };
      }
    }
  }
  return null;
}

function buildInsertIdentityAnswer(insert) {
  const brands = (insert.typicalHomeBrands || []).join(", ");
  return (
    `<b>${insert.name}</b> is a <b>${insert.manufacturer}</b> ${insert.family || "insert"} - it is not a ${
      insert.manufacturer === "Panini" ? "Topps" : "Panini"
    } product.<br><br>` +
    (brands ? `Most commonly found in: <b>${brands}</b>.<br><br>` : "") +
    (insert.notes || "")
  );
}

// Splits the model's trailing <<CARDSTORM_DATA>>{...} line from the
// human-facing answer and parses it. Never throws - a malformed or missing
// block just yields an empty structured result, never a fake one.
function extractStructured(rawText) {
  const idx = rawText.indexOf(CARDSTORM_JSON_MARKER);
  if (idx === -1) return { answer: rawText.trim(), structured: {} };
  const answer = rawText.slice(0, idx).trim();
  const jsonPart = rawText.slice(idx + CARDSTORM_JSON_MARKER.length).trim();
  try {
    const structured = JSON.parse(jsonPart);
    return { answer, structured: structured && typeof structured === "object" ? structured : {} };
  } catch (e) {
    return { answer, structured: {} };
  }
}

// Single source of truth for the research/model routing decision - used by
// analyze() and directly by scripts/test-routing.js, so the tests can never
// silently drift out of sync with the real logic the way a second
// hand-copied regex would.
const RESEARCH_SIGNALS =
  /\b(this week|this month|this year|right now|currently|latest|newest|new release|just released|top rookies|flagship|chasing)\b/i;
const YEAR_SIGNAL = /\b202[4-9]\b/;

function computeRouting({ question, hasImages, groundedData }) {
  // Research is only worth its latency/cost when (a) CardStorm's own
  // verified/curated data doesn't already cover the question and (b) the
  // question actually signals a need for fresh information - a bare "hot"
  // or "recent" used to be enough to trigger this and was firing (and
  // timing out) on questions CardStorm's own WATCHCAT/COMPS data already
  // answers, like "what rookies are hot?". Explicit freshness language, an
  // explicit near-future product year, or a product/insert/manufacturer
  // identity question CardStorm's own productKnowledge table doesn't cover
  // ("what product is X in", "is X a Topps product") still qualifies - the
  // last of those is exactly the class of question that produced a wrong
  // "Downtown is a Topps insert" answer before this rule existed.
  const alreadyCovered = cardstormData.hasInternalCoverage(groundedData);
  const isUngroundedIdentityQuestion = !alreadyCovered && cardstormData.isProductIdentityQuestion(question || "");
  const needsResearch =
    !alreadyCovered &&
    !hasImages &&
    (RESEARCH_SIGNALS.test(question || "") || YEAR_SIGNAL.test(question || "") || isUngroundedIdentityQuestion);
  return { needsResearch, model: chooseModel({ hasImages, needsResearch }) };
}

async function analyze({ question, conversation, images, groundedData }) {
  const client = getClient();
  if (!client) {
    return {
      connected: false,
      answer:
        "Ask CardStorm's full answer engine isn't connected yet on this deployment - a required API key hasn't been configured server-side. Your question wasn't sent anywhere, nothing was guessed, and no data was fabricated.",
      answerType: "system_unavailable",
      confidence: null,
      warnings: ["CARDSTORM_AI_API_KEY (or ANTHROPIC_API_KEY) is not set in this environment."],
    };
  }

  const messages = [];
  for (const turn of conversation) {
    messages.push({ role: turn.role, content: turn.text });
  }
  messages.push({ role: "user", content: buildUserContent({ question, images, groundedData }) });

  const hasImages = !!(images.front || images.back || images.general);
  const { needsResearch, model } = computeRouting({ question, hasImages, groundedData });

  const tools = [];
  if (needsResearch) {
    tools.push({ type: "web_search_20260209", name: "web_search" });
  }

  let response;
  try {
    response = await client.messages.create(
      {
        model,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages,
        ...(tools.length ? { tools } : {}),
      },
      { timeout: MODEL_CALL_TIMEOUT_MS }
    );
  } catch (err) {
    // Verified against the installed SDK: these error classes don't set
    // .name to their class name (it stays "Error" on the instance), so
    // detection must use instanceof, not a name string match.
    const isTimeout =
      err instanceof Anthropic.APIConnectionTimeoutError || (err && /timeout/i.test(err.message || ""));
    if (isTimeout) {
      return {
        connected: true,
        error: true,
        answer:
          "CardStorm couldn't finish the live research in time. Try again, or ask me to answer from CardStorm's verified data instead.",
        answerType: "research_timeout",
        warnings: ["provider_timeout"],
      };
    }
    return {
      connected: true,
      error: true,
      answer:
        "CardStorm's answer engine hit a snag reaching the AI service. Please try again in a moment.",
      answerType: "provider_error",
      warnings: [`provider_error: ${err && err.status ? err.status : "unknown"}`],
    };
  }

  const webSources = [];
  for (const block of response.content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.url) webSources.push({ type: "web", url: r.url, label: r.title || r.url });
      }
    }
  }

  const textBlocks = response.content.filter((b) => b.type === "text").map((b) => b.text);
  const rawAnswer = textBlocks.join("\n").trim();
  let { answer, structured } = extractStructured(
    rawAnswer || "CardStorm couldn't produce an answer for that just now."
  );

  const conflict = detectManufacturerConflict(answer, groundedData);
  const conflictWarnings = [];
  if (conflict) {
    answer = buildInsertIdentityAnswer(conflict.insert);
    conflictWarnings.push(
      `corrected_manufacturer_conflict: model attributed ${conflict.insert.name} to ${conflict.wrongManufacturer}, CardStorm verified data says ${conflict.insert.manufacturer}`
    );
    // The visible answer was replaced with a grounded-only statement, so
    // the structured fields describing it must come from the same
    // grounded fact, not from the (already-proven-wrong) model output.
    structured = {
      ...structured,
      identifiedProducts: conflict.insert.typicalHomeBrands || [],
      identifiedSets: [`${conflict.insert.name} insert`],
    };
  }

  // CardStorm-verified comps always win over anything the model self-reports
  // in its structured block - the model never gets to be the source of
  // truth for a sold price, only a formatter of data it was actually given.
  const hasVerifiedComps = !!(groundedData && groundedData.matchedComps.length);
  const soldComps = hasVerifiedComps ? groundedData.matchedComps : null;

  const sources = [];
  if (
    hasVerifiedComps ||
    (groundedData && (groundedData.matchedCards.length || groundedData.matchedProducts.length))
  ) {
    sources.push({ type: "internal", label: "CardStorm Verified Data" });
  }
  sources.push(...webSources.slice(0, 5));

  return {
    connected: true,
    answer,
    answerType: hasImages ? "vision" : webSources.length ? "research" : hasVerifiedComps ? "verified_data" : "general",
    contentType: structured.contentType || null,
    confidence: structured.confidence ?? null,
    identifiedCards: Array.isArray(structured.identifiedCards) ? structured.identifiedCards : [],
    identifiedProducts: Array.isArray(structured.identifiedProducts) ? structured.identifiedProducts : [],
    identifiedPlayers: Array.isArray(structured.identifiedPlayers) ? structured.identifiedPlayers : [],
    identifiedTeams: Array.isArray(structured.identifiedTeams) ? structured.identifiedTeams : [],
    identifiedSets: Array.isArray(structured.identifiedSets) ? structured.identifiedSets : [],
    rarityGuidance: structured.rarityGuidance || null,
    gradingGuidance: structured.gradingGuidance || null,
    soldComps,
    suggestedFollowups: Array.isArray(structured.suggestedFollowups) ? structured.suggestedFollowups : [],
    sources,
    warnings: [...(Array.isArray(structured.warnings) ? structured.warnings : []), ...conflictWarnings],
  };
}

module.exports = {
  analyze,
  MODEL_ID,
  MODEL_FAST,
  MODEL_STRONG,
  chooseModel,
  computeRouting,
  extractStructured,
  detectManufacturerConflict,
  buildInsertIdentityAnswer,
  CARDSTORM_JSON_MARKER,
};
