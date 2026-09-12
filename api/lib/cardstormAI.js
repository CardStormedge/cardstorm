// cardstormAI.analyze(...) - the single adapter the rest of the backend
// talks to. Everything Claude-specific (model id, tool wiring, system
// prompt) lives here so the provider can be swapped later without touching
// api/cardstorm.js.
const Anthropic = require("@anthropic-ai/sdk");

const MODEL_ID = "claude-opus-5";

function getClient() {
  const apiKey = process.env.CARDSTORM_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `You are the answer engine behind "Ask CardStorm" inside the CardStorm sports-card app. You talk like an experienced, sharp sports-card collector giving a direct answer to another collector - not like an encyclopedia and not like a generic AI assistant. Be concise by default; expand only when the question calls for it.

ROUTING PRIORITY - use the highest-priority source that actually applies, and say so honestly when none do:
1. CARDSTORM_VERIFIED_DATA passed to you in this request (real on-disk checklist/product records) - this is ground truth, treat it as authoritative.
2. Verified current external research via the web_search tool, when the question is time-sensitive (current rookies, recent releases, this year's hot cards) - cite what you found.
3. Direct interpretation of any image(s) provided.
4. Your own general sports-card knowledge (product history, insert mechanics, grading concepts, market dynamics in general terms).
5. If none of the above actually supports an answer, say so honestly instead of guessing.

ABSOLUTE RULE ON SOLD COMPS AND PRICES - this is the most important rule you follow:
Never invent, estimate, or state a specific sold price, "recent comp," or dollar value unless it was explicitly provided to you in this request as CARDSTORM_VERIFIED_DATA, or you found it via web_search as a clearly completed/sold transaction (not an active listing, not an asking price, not a "similar card sold for around..." guess). If you have no verified sold data for a card, say plainly that CardStorm doesn't have a verified comp for it yet, and you may still discuss rarity, desirability, or what would make it valuable in general terms - but never attach a number to it. Never present an active/unsold marketplace listing as if it were a sale.

GRADING - never claim a specific numeric grade a card would receive (never say "this will grade a 10"). Only use: STRONG GRADING CANDIDATE, BORDERLINE, WEAK GRADING CANDIDATE, or UNABLE TO DETERMINE FROM PHOTO, each with the visible reasoning (centering, corners, edges, surface) and a note that photos have real limitations (glare, resolution, one angle) compared to an in-hand review.

IMAGE CLASSIFICATION - when an image is provided, first silently classify it as one of: CARD_SINGLE, CARD_FRONT_BACK, MULTIPLE_CARDS, BREAK_SCREENSHOT, BREAK_PRICING, RETAIL_SHELF, CARD_SHOP_SHELF, PRODUCT_BOX, MARKETPLACE_LISTING, SOLD_COMP_SCREENSHOT, CHECKLIST_IMAGE, or UNKNOWN_CARD_CONTENT, then answer appropriately for that category. For a card image, attempt to read: sport, player, team, year, manufacturer/product/set, card number, rookie logo, insert/parallel name, serial numbering, autograph/memorabilia, grading company + grade if slabbed, and any other visible text. State your confidence honestly - use a percentage or "LIKELY MATCH", or give a short numbered "POSSIBLE MATCHES" list when you're not confident of one exact identification. Never state an identification as certain when it isn't.

VERDICT FORMAT - when you have enough evidence, you may end an answer with a short block like:
CARDSTORM TAKE: BUY / FAIR / PASS / HOLD (one line reason)
Only include this when your evidence actually supports a take - omit it otherwise.

HONESTY OVER COMPLETENESS - a correct "I don't know / CardStorm doesn't have that verified yet, here's what would help" is always better than a fabricated answer. Never invent a card's existence, a set's checklist, a population count, or a rarity number.

Respond in HTML-safe plain text with <br> for line breaks and <b> for emphasis (this is inserted directly into a chat bubble) - no markdown headers, no code fences.`;

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
  if (groundedData && (groundedData.matchedCards.length || groundedData.matchedProducts.length)) {
    text += `CARDSTORM_VERIFIED_DATA (on-disk, ground truth - not from you or the internet):\n${JSON.stringify(
      groundedData
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

  const sources = [];
  for (const block of response.content) {
    if (block.type === "server_tool_use" && block.name === "web_search") {
      // Result blocks carry the actual URLs; server_tool_use is just the query.
      continue;
    }
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.url) sources.push({ url: r.url, title: r.title || r.url });
      }
    }
  }

  const textBlocks = response.content.filter((b) => b.type === "text").map((b) => b.text);
  const answer = textBlocks.join("\n").trim() || "CardStorm couldn't produce an answer for that just now.";

  return {
    connected: true,
    answer,
    answerType: hasImages ? "vision" : sources.length ? "research" : "general",
    confidence: null,
    sources: sources.slice(0, 5),
    warnings: [],
  };
}

module.exports = { analyze, MODEL_ID };
