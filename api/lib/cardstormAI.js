// cardstormAI.analyze(...) - the single adapter the rest of the backend
// talks to. Everything Claude-specific (model id, tool wiring, system
// prompt) lives here so the provider can be swapped later without touching
// api/cardstorm.js.
//
// Model ID verified current for this account/environment as of this build:
// "claude-opus-5" is the Claude 5 family's flagship model (per this
// environment's own model directory and the bundled claude-api skill docs),
// with native image understanding in the same request as text (no separate
// vision credential/service) and the server-side "web_search_20260209" tool
// for live research under the same API key - covering vision + research +
// reasoning in one adapter, one credential, one call.
const Anthropic = require("@anthropic-ai/sdk");

const MODEL_ID = "claude-opus-5";

function getClient() {
  const apiKey = process.env.CARDSTORM_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// The model is asked to end every answer with one trailing line of JSON so
// the backend can extract structured fields without guessing at an
// unverified "structured output" API shape - this is plain prompting +
// server-side parsing, which works with the plain Messages API used here.
// CARDSTORM_JSON_MARKER must never appear in normal answer text.
const CARDSTORM_JSON_MARKER = "<<CARDSTORM_DATA>>";

const SYSTEM_PROMPT = `You are the answer engine behind "Ask CardStorm" inside the CardStorm sports-card app. You talk like an experienced, sharp sports-card collector giving a direct answer to another collector - not like an encyclopedia and not like a generic AI assistant. Be concise by default; expand only when the question calls for it.

ROUTING PRIORITY - use the highest-priority source that actually applies, and say so honestly when none do:
1. CARDSTORM_VERIFIED_DATA passed to you in this request - this includes CardStorm's own verified sold comps (verifiedComps), curated-but-unverified chase suggestions (curatedChases - never call these "verified"), and on-disk checklist/product records. Treat verifiedComps and checklist/product records as ground truth.
2. Verified current external research via the web_search tool, when the question is time-sensitive (current rookies, recent releases, this year's hot cards) - cite what you found.
3. Direct interpretation of any image(s) provided.
4. Your own general sports-card knowledge (product history, insert mechanics, grading concepts, market dynamics in general terms).
5. If none of the above actually supports an answer, say so honestly instead of guessing.

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
      groundedData.matchedChases.length);
  if (hasGrounding) {
    text += `CARDSTORM_VERIFIED_DATA (on-disk, ground truth - not from you or the internet):\n${JSON.stringify(
      {
        verifiedComps: groundedData.matchedComps,
        verifiedCompsSchema: "[player, price, cardDescription, grade, saleDate, source, verifyUrl]",
        curatedChases: groundedData.matchedChases,
        curatedChasesSchema: "[player, sport, hit1, hit2, hit3] - editorial suggestions, NOT verified sales/checklist facts",
        checklistCards: groundedData.matchedCards,
        products: groundedData.matchedProducts,
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
  const needsResearch = /\b(current|this year|latest|hot|recent|new release|202[4-9])\b/i.test(question || "");

  const tools = [];
  if (needsResearch && !hasImages) {
    tools.push({ type: "web_search_20260209", name: "web_search" });
  }

  let response;
  try {
    response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages,
      ...(tools.length ? { tools } : {}),
    });
  } catch (err) {
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
  const { answer, structured } = extractStructured(
    rawAnswer || "CardStorm couldn't produce an answer for that just now."
  );

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
    warnings: Array.isArray(structured.warnings) ? structured.warnings : [],
  };
}

module.exports = { analyze, MODEL_ID, extractStructured, CARDSTORM_JSON_MARKER };
