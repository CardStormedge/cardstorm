// TEMPORARY PROOF-OF-CONCEPT ENDPOINT - NOT wired into any production UI.
//
// POST /api/card-image-poc
// Body: { "query": "2000 SP Authentic Tom Brady 118", "provider": "tradingcardapi" | "thecardapi", "mode": "catalog" | "sales" }
//   - provider defaults to "tradingcardapi" if omitted.
//   - mode only applies to "thecardapi" (catalog identity vs sold-sales
//     lookup are separate calls there); defaults to "sales".
// Response: { provider, mode, query, results: [...], note }
//
// Purpose: let CardStorm evaluate whether a sports-card database/API can
// reliably supply card identity, images, and/or sold comps before any
// larger integration is built. Server-side only - no provider API key
// ever reaches the client, and this endpoint returns no key/secret in
// any response, under any field name.
//
// If the relevant API key env var is not configured, this endpoint
// returns an honest "provider not configured" response - it never
// fabricates a card record, image URL, or sale price. See
// docs/CARD_IMAGE_PROVIDER_POC.md.
const { applyCors } = require("./lib/cors");
const tradingCardApi = require("./lib/cardProviders/tradingCardApi");
const theCardApi = require("./lib/cardProviders/theCardApi");
const { normalizeCard } = require("./lib/cardProviders/normalizeCard");
const { normalizeSaleComp } = require("./lib/cardProviders/normalizeSaleComp");

async function handleTradingCardApi(query) {
  if (!tradingCardApi.isConfigured()) {
    return {
      results: [],
      note:
        "TRADING_CARD_API_KEY is not configured in this environment. This proof-of-concept never fakes a provider response - live results are unavailable until real credentials are added.",
    };
  }
  const raw = await tradingCardApi.searchCards(query);
  const records = Array.isArray(raw.data) ? raw.data : raw.data ? [raw.data] : [];
  const included = Array.isArray(raw.included) ? raw.included : [];
  if (records.length === 0) {
    return {
      results: [normalizeCard(null, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_NO_MATCH" })],
      note: "Provider returned zero matches for this query.",
    };
  }
  const verificationStatus = records.length > 1 ? "PROVIDER_AMBIGUOUS" : "PROVIDER_MATCHED";
  const results = records.map((resource) =>
    normalizeCard(tradingCardApi.mapCardResource(resource, included), { provider: "tradingcardapi.com", verificationStatus })
  );
  return {
    results,
    note: records.length > 1 ? `Provider returned ${records.length} candidate matches - none auto-selected.` : null,
  };
}

async function handleTheCardApiCatalog(query) {
  // The confirmed catalog endpoint is by-ucid only (/catalog/{ucid}) - no
  // documented search-by-text-query catalog endpoint was found, so a
  // free-text catalog search cannot be performed here. This is reported
  // honestly rather than guessed at.
  return {
    results: [],
    note:
      "The Card API's Catalog lookup is documented only as a by-UCID endpoint (/catalog/{ucid}); no free-text catalog search endpoint could be confirmed from public docs, so this POC cannot run a text-query catalog search for The Card API. Catalog access also requires the Pro plan or a paid Builder add-on, separate from the free Sales tier.",
  };
}

async function handleTheCardApiSales(query, expectedFields) {
  if (!theCardApi.isConfigured()) {
    return {
      results: [],
      note:
        "THE_CARD_API_KEY is not configured in this environment. This proof-of-concept never fakes a provider response - live results are unavailable until real credentials are added.",
    };
  }
  const raw = await theCardApi.searchSales(query);
  const records = Array.isArray(raw.data) ? raw.data : Array.isArray(raw.sales) ? raw.sales : [];
  if (records.length === 0) {
    return {
      results: [normalizeSaleComp(null, null, { provider: "thecardapi.com" })],
      note: "Provider returned zero sales matches for this query.",
    };
  }
  const results = records.map((r) => {
    const mapped = theCardApi.mapSaleRecord(r);
    const matchResult = expectedFields ? theCardApi.scoreCardMatch(expectedFields, mapped) : null;
    return normalizeSaleComp(mapped, matchResult, { provider: "thecardapi.com" });
  });
  return { results, note: records.length > 1 ? `Provider returned ${records.length} sale records for this query.` : null };
}

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

  const body = req.body || {};
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const provider = body.provider === "thecardapi" ? "thecardapi" : "tradingcardapi";
  const mode = body.mode === "catalog" ? "catalog" : "sales";
  const expectedFields = body.expectedFields && typeof body.expectedFields === "object" ? body.expectedFields : null;

  if (!query) {
    res.status(400).json({ error: "A non-empty 'query' string is required." });
    return;
  }

  try {
    let outcome;
    if (provider === "thecardapi") {
      outcome = mode === "catalog" ? await handleTheCardApiCatalog(query) : await handleTheCardApiSales(query, expectedFields);
    } else {
      outcome = await handleTradingCardApi(query);
    }
    res.status(200).json({ provider, mode: provider === "thecardapi" ? mode : undefined, query, results: outcome.results, note: outcome.note });
  } catch (err) {
    // Never leak provider error internals (could include request URLs with
    // query params, stack traces, etc) to the client - same convention as
    // api/cardstorm.js.
    res.status(502).json({
      provider,
      query,
      results: [],
      note: "The provider call failed. See server logs for details.",
    });
  }
};
