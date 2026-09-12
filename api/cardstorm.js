// POST /api/cardstorm - the single backend endpoint the Ask CardStorm
// frontend calls. Routes a question (and optional images) through:
// verified on-disk CardStorm data -> live research -> vision -> general
// knowledge -> honest "can't answer that" - never fabricating a sold comp,
// rarity fact, or card identity. See api/lib/cardstormAI.js for the model
// call and the routing/anti-fabrication system prompt.
const { applyCors } = require("./lib/cors");
const { validateRequestBody, ValidationError } = require("./lib/validate");
const cardstormAI = require("./lib/cardstormAI");
const cardstormData = require("./lib/cardstormData");

// Best-effort in-memory rate limit. Serverless instances are ephemeral and
// multiple may run concurrently, so this is a soft speed bump against
// accidental abuse/loops, not a real distributed limiter - fine for this
// stage, called out as a known limitation.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  if (hits.size > 5000) hits.clear(); // bound memory on long-lived instances
  return entry.count > RATE_LIMIT_MAX;
}

module.exports = async (req, res) => {
  const originAllowed = applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!originAllowed) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many requests - please wait a moment and try again." });
    return;
  }

  let payload;
  try {
    payload = validateRequestBody(req.body);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const groundedData = cardstormData.lookup(payload.question);

  try {
    const result = await cardstormAI.analyze({
      question: payload.question,
      conversation: payload.conversation,
      images: payload.images,
      groundedData,
    });

    // Merge the model's self-reported identifications with what CardStorm
    // itself already matched on disk - on-disk grounding is never
    // overwritten, only added to (dedup by exact string).
    const dedupMerge = (fromGrounding, fromModel) => [
      ...new Set([...fromGrounding, ...(Array.isArray(fromModel) ? fromModel : [])]),
    ];
    const groundedProducts = groundedData.matchedProducts.map((p) => `${p.brand} ${p.product}`.trim());
    const groundedPlayers = [
      ...new Set([
        ...groundedData.matchedCards.map((c) => c.player),
        ...groundedData.matchedComps.map((c) => c[0]),
        ...groundedData.matchedChases.map((c) => c[0]),
      ]),
    ];

    res.status(200).json({
      answer: result.answer,
      answerType: result.answerType,
      contentType: result.contentType || null,
      confidence: result.confidence ?? null,
      identifiedCards: result.identifiedCards || [],
      identifiedProducts: dedupMerge(groundedProducts, result.identifiedProducts),
      identifiedPlayers: dedupMerge(groundedPlayers, result.identifiedPlayers),
      identifiedTeams: result.identifiedTeams || [],
      identifiedSets: result.identifiedSets || [],
      marketData: null,
      soldComps: result.soldComps || null,
      rarityGuidance: result.rarityGuidance || null,
      gradingGuidance: result.gradingGuidance || null,
      breakGuidance: null,
      retailGuidance: null,
      listingGuidance: null,
      sources: result.sources || [],
      suggestedFollowups: result.suggestedFollowups || [],
      warnings: result.warnings || [],
    });
  } catch (err) {
    // Never leak internal error details/stack traces to the client.
    res.status(500).json({
      error: "CardStorm's answer engine hit an unexpected problem. Please try again.",
    });
  }
};
