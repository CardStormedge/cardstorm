// TEMPORARY PROOF-OF-CONCEPT ENDPOINT - NOT wired into any production UI.
//
// POST /api/card-image-poc
// Body: { "query": "2000 SP Authentic Tom Brady 118" }
// Response: { provider, query, results: [normalizedCard, ...], note }
//
// Purpose: let CardStorm evaluate whether tradingcardapi.com can reliably
// supply card identity + images before any larger integration is built.
// Server-side only - the API key never reaches the client, and this
// endpoint itself returns no key/secret in any response.
//
// If TRADING_CARD_API_KEY is not configured, this endpoint returns an
// honest "provider not configured" response - it never fabricates a card
// record or image URL. See docs/CARD_IMAGE_PROVIDER_POC.md.
const { applyCors } = require("./lib/cors");
const tradingCardApi = require("./lib/cardProviders/tradingCardApi");
const { normalizeCard } = require("./lib/cardProviders/normalizeCard");

module.exports = async (req, res) => {
  const originAllowed = applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (!originAllowed) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  res.setHeader("X-CardStorm-POC", "card-image-provider");

  const query = req.body && typeof req.body.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    res.status(400).json({ error: "A non-empty 'query' string is required." });
    return;
  }

  if (!tradingCardApi.isConfigured()) {
    res.status(200).json({
      provider: "tradingcardapi.com",
      query,
      results: [],
      note:
        "TRADING_CARD_API_KEY is not configured in this environment. This proof-of-concept never fakes a provider response - live results are unavailable until real credentials are added. See docs/CARD_IMAGE_PROVIDER_POC.md for how to configure and what to expect once they are.",
    });
    return;
  }

  try {
    const raw = await tradingCardApi.searchCards(query);
    const records = Array.isArray(raw.data) ? raw.data : raw.data ? [raw.data] : [];
    const included = Array.isArray(raw.included) ? raw.included : [];

    if (records.length === 0) {
      res.status(200).json({
        provider: "tradingcardapi.com",
        query,
        results: [normalizeCard(null, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_NO_MATCH" })],
        note: "Provider returned zero matches for this query.",
      });
      return;
    }

    const verificationStatus = records.length > 1 ? "PROVIDER_AMBIGUOUS" : "PROVIDER_MATCHED";
    const results = records.map((resource) =>
      normalizeCard(tradingCardApi.mapCardResource(resource, included), {
        provider: "tradingcardapi.com",
        verificationStatus,
      })
    );

    res.status(200).json({
      provider: "tradingcardapi.com",
      query,
      results,
      note:
        records.length > 1
          ? `Provider returned ${records.length} candidate matches - none auto-selected, per the ambiguous-result rule.`
          : null,
    });
  } catch (err) {
    // Never leak provider error internals (could include request URLs with
    // query params, stack traces, etc) to the client - same convention as
    // api/cardstorm.js.
    res.status(502).json({
      provider: "tradingcardapi.com",
      query,
      results: [normalizeCard(null, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_ERROR" })],
      note: "The provider call failed. See server logs for details.",
    });
  }
};
