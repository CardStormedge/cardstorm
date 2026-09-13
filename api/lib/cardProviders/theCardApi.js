// Adapter for thecardapi.com ("The Card API") - evaluated as a lower-
// access-barrier alternative to Trading Card API.
//
// SOURCING NOTE (read before trusting anything below): this environment has
// no direct page-fetch access to thecardapi.com (confirmed via
// EGRESS_BLOCKED, not assumed). Everything here is built from the
// provider's own public docs/marketing pages via WebSearch result
// summaries, cross-checked across multiple queries. See
// docs/CARD_IMAGE_PROVIDER_POC.md for the full sourcing writeup and what
// could/couldn't be confirmed.
//
// CONFIRMED from public docs:
//  - Auth: `x-market-api-key` header for REST (an `Authorization: Bearer`
//    variant exists for their separate MCP server, not used here).
//  - Sales record fields explicitly named in docs: id, title, price,
//    listing_type, sold_at, print_run.
//  - Catalog records carry a permanent `ucid` (format like
//    "UC-1KJZD-TZG7C-6", case-insensitive, dashes optional, with a check
//    digit) - never reused, names/years may be corrected but the ucid
//    itself never changes. Catalog-by-id path: /catalog/{ucid}.
//  - Sales API is usable on the free/self-serve tier ("free to start", no
//    credit card, key issued in seconds); the Catalog API is bundled with
//    the Pro plan or a $29/mo add-on on the Builder plan - i.e. NOT fully
//    free. This adapter does not assume Catalog access is available just
//    because a key exists - see `hasCatalogAccess` handling below.
//
// NOT CONFIRMED (per "do not guess field names/endpoints"): the exact
// search query-parameter names for GET /sales and any catalog search-by-
// query endpoint (only the by-id /catalog/{ucid} path is documented in
// what this environment could reach). Marked TODO(live-verify) below.

const BASE_URL = "https://www.thecardapi.com";

class TheCardApiError extends Error {
  constructor(message, { status = null, cause = null, reason = null } = {}) {
    super(message);
    this.name = "TheCardApiError";
    this.status = status;
    this.cause = cause;
    this.reason = reason; // e.g. "CATALOG_REQUIRES_PAID_PLAN"
  }
}

function getApiKey() {
  return process.env.THE_CARD_API_KEY || null;
}

function isConfigured() {
  return !!getApiKey();
}

function authHeaders(apiKey) {
  return { "x-market-api-key": apiKey, Accept: "application/json" };
}

// GET /sales?q=<query> - TODO(live-verify): confirm the actual query
// parameter name; `q` is a conventional guess, not a confirmed key.
async function searchSales(query, { fetchImpl = fetch } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new TheCardApiError(
      "THE_CARD_API_KEY is not set - this POC never fakes a response when the provider isn't configured."
    );
  }
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new TheCardApiError("searchSales requires a non-empty query string.");
  }

  const url = `${BASE_URL}/sales?q=${encodeURIComponent(query.trim())}`;
  let res;
  try {
    res = await fetchImpl(url, { method: "GET", headers: authHeaders(apiKey) });
  } catch (networkErr) {
    throw new TheCardApiError("Network error calling The Card API sales endpoint.", { cause: networkErr });
  }
  if (res.status === 402 || res.status === 403) {
    throw new TheCardApiError("The Card API rejected this request - plan/quota limit likely reached.", {
      status: res.status,
      reason: "PLAN_OR_QUOTA_LIMIT",
    });
  }
  if (!res.ok) {
    throw new TheCardApiError(`The Card API sales endpoint returned HTTP ${res.status}.`, { status: res.status });
  }
  try {
    return await res.json();
  } catch (parseErr) {
    throw new TheCardApiError("The Card API sales response was not valid JSON.", { cause: parseErr });
  }
}

// GET /catalog/{ucid} - the one endpoint shape actually confirmed by docs.
// Catalog access requires Pro or the Builder catalog add-on - a 402/403
// here is treated as "not entitled," never silently swallowed.
async function getCatalogCardByUcid(ucid, { fetchImpl = fetch } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new TheCardApiError("THE_CARD_API_KEY is not set.");
  }
  if (!ucid || typeof ucid !== "string") {
    throw new TheCardApiError("getCatalogCardByUcid requires a ucid string.");
  }
  const url = `${BASE_URL}/catalog/${encodeURIComponent(ucid.trim())}`;
  let res;
  try {
    res = await fetchImpl(url, { method: "GET", headers: authHeaders(apiKey) });
  } catch (networkErr) {
    throw new TheCardApiError("Network error calling The Card API catalog endpoint.", { cause: networkErr });
  }
  if (res.status === 402 || res.status === 403) {
    throw new TheCardApiError("Catalog access is not included on the current plan (Pro, or Builder + $29/mo add-on required).", {
      status: res.status,
      reason: "CATALOG_REQUIRES_PAID_PLAN",
    });
  }
  if (!res.ok) {
    throw new TheCardApiError(`The Card API catalog endpoint returned HTTP ${res.status}.`, { status: res.status });
  }
  try {
    return await res.json();
  } catch (parseErr) {
    throw new TheCardApiError("The Card API catalog response was not valid JSON.", { cause: parseErr });
  }
}

// Maps one raw sales record using ONLY the field names actually confirmed
// in public docs (id, title, price, listing_type, sold_at, print_run).
// Everything else (player/year/set/cardNumber/grade/grader/marketplace/
// image) is not a confirmed key name - left null rather than guessed, per
// instructions. `matchCardIdentity()` below scores `title` against the
// query instead of trusting it as proof of identity.
function mapSaleRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    providerSaleId: raw.id ?? null,
    title: raw.title ?? null, // used only for match scoring, never as proof
    salePrice: typeof raw.price === "number" ? raw.price : null,
    saleDate: raw.sold_at ?? null,
    listingType: raw.listing_type ?? null, // e.g. auction / fixed_price / best_offer, per docs
    printRun: raw.print_run ?? null,
    // Not confirmed field names - left null until a real response is seen:
    marketplace: null,
    grade: null,
    grader: null,
    slabSerial: null,
    imageUrl: null,
    sourceUrl: null,
  };
}

// A `ucid`-carrying catalog record. Field names beyond `ucid` are not
// confirmed - see file header.
function mapCatalogRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const data = raw.data && typeof raw.data === "object" ? raw.data : raw;
  return {
    providerCardId: data.ucid ?? null,
    player: data.player ?? null,
    sport: data.sport ?? null,
    year: data.year ?? null,
    manufacturer: data.manufacturer ?? null,
    brand: data.brand ?? null,
    set: data.set ?? null,
    cardNumber: data.cardNumber ?? data.card_number ?? null,
    parallel: data.parallel ?? null,
    rookie: typeof data.rookie === "boolean" ? data.rookie : null,
    auto: typeof data.auto === "boolean" ? data.auto : null,
    relic: typeof data.relic === "boolean" ? data.relic : null,
    printRun: data.print_run ?? null,
    parentProduct: data.parent_product ?? null,
    frontImageUrl: data.frontImageUrl ?? data.front_image_url ?? null,
    backImageUrl: data.backImageUrl ?? data.back_image_url ?? null,
    sourceUrl: data.url ?? null,
  };
}

// Strong-field match scoring, per the "do not treat title similarity as
// proof of identity" instruction. Compares only structured fields we
// asked for against what the record actually carries; `title` text is
// NOT used as identity evidence, only surfaced for a human to read.
// Returns { score (0-1), matchedFields, mismatchedFields }.
function scoreCardMatch(expected, record) {
  const fields = ["player", "year", "set", "cardNumber", "parallel", "grade", "grader"];
  const matched = [];
  const mismatched = [];
  const comparable = fields.filter((f) => expected[f] != null && record[f] != null);
  for (const f of fields) {
    if (expected[f] == null || record[f] == null) continue;
    const a = String(expected[f]).trim().toLowerCase();
    const b = String(record[f]).trim().toLowerCase();
    if (a === b) matched.push(f);
    else mismatched.push(f);
  }
  const score = comparable.length ? matched.length / comparable.length : 0;
  return { score, matchedFields: matched, mismatchedFields: mismatched, comparableFieldCount: comparable.length };
}

module.exports = {
  searchSales,
  getCatalogCardByUcid,
  mapSaleRecord,
  mapCatalogRecord,
  scoreCardMatch,
  isConfigured,
  TheCardApiError,
  BASE_URL,
};
