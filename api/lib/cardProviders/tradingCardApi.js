// Adapter for tradingcardapi.com ("Trading Card API"), the primary provider
// under test for this proof of concept.
//
// SOURCING NOTE (read before trusting anything below): this environment has
// no direct page-fetch access to tradingcardapi.com (confirmed via
// EGRESS_BLOCKED, not assumed) and no live API credentials were available
// to capture a real response. Everything here is built from what the
// provider's own public marketing/docs pages state via search-result
// summaries: a stable `/v1` REST prefix, the JSON:API specification
// (`Accept`/`Content-Type: application/vnd.api+json`), Bearer-token auth,
// a `/cards` resource, and a documented entity model of Cards, Sets,
// Players, Teams, Card Images, Attributes, and OnCard Relationships.
// See docs/CARD_IMAGE_PROVIDER_POC.md for the full sourcing writeup.
//
// IMPORTANT: the exact JSON:API `attributes`/`relationships` KEY NAMES
// (e.g. whether a card's year lives at `attributes.year` vs
// `attributes.releaseYear`) are NOT published anywhere this environment
// could reach, and per the "do not guess field names" instruction this
// adapter does not invent them. `mapCardResource()` below does a
// best-effort, defensively-coded extraction across a few plausible key
// spellings implied by the documented entity model, but every mapped
// field must be re-verified against one real captured response before
// this is trusted for anything beyond this POC - see the TODO markers.
//
// Requires the API key server-side only, via the TRADING_CARD_API_KEY
// environment variable. Never hardcode a key here; never send it to the
// client in any form.

const BASE_URL = "https://api.tradingcardapi.com/v1";

class TradingCardApiError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message);
    this.name = "TradingCardApiError";
    this.status = status;
    this.cause = cause;
  }
}

function getApiKey() {
  return process.env.TRADING_CARD_API_KEY || null;
}

function isConfigured() {
  return !!getApiKey();
}

// GET /v1/cards?filter[search]=<query> - the `filter[search]` param name is
// JSON:API's conventional filtering shape, not a value confirmed for this
// specific provider from a captured response. TODO(live-verify): confirm
// the actual query-param name once credentials exist.
async function searchCards(query, { fetchImpl = fetch } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new TradingCardApiError(
      "TRADING_CARD_API_KEY is not set - this POC never fakes a response when the provider isn't configured.",
      { status: null }
    );
  }
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new TradingCardApiError("searchCards requires a non-empty query string.");
  }

  const url = `${BASE_URL}/cards?filter[search]=${encodeURIComponent(query.trim())}`;
  let res;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
    });
  } catch (networkErr) {
    throw new TradingCardApiError("Network error calling Trading Card API.", { cause: networkErr });
  }

  if (!res.ok) {
    throw new TradingCardApiError(`Trading Card API returned HTTP ${res.status}.`, { status: res.status });
  }

  let body;
  try {
    body = await res.json();
  } catch (parseErr) {
    throw new TradingCardApiError("Trading Card API response was not valid JSON.", { cause: parseErr });
  }
  return body; // raw JSON:API document - { data: [...], included: [...] }
}

// Best-effort JSON:API resource -> plain-object mapping. Returns null for
// any field this function isn't confident about rather than guessing, per
// the "only populate verified fields" rule. `included` is the JSON:API
// sideloaded-resources array (Players/Sets/Teams/etc), used to resolve
// relationships when present.
function mapCardResource(resource, included = []) {
  if (!resource || typeof resource !== "object") return null;
  const attrs = resource.attributes || {};
  const rels = resource.relationships || {};

  function findIncluded(relName, type) {
    const rel = rels[relName];
    const relData = rel && rel.data;
    if (!relData) return null;
    const ids = Array.isArray(relData) ? relData : [relData];
    const first = ids[0];
    if (!first) return null;
    return included.find((inc) => inc.type === (type || first.type) && inc.id === first.id) || null;
  }

  const playerResource = findIncluded("player") || findIncluded("players");
  const setResource = findIncluded("set") || findIncluded("sets");
  const imagesRel = rels.cardImages || rels.images;

  // TODO(live-verify): every `attrs.<x>` lookup below is a best guess from
  // the documented entity model, not a confirmed key name. Re-check each
  // one against a real captured response before relying on this mapping.
  return {
    providerCardId: resource.id ?? null,
    player: (playerResource && playerResource.attributes && (playerResource.attributes.name || playerResource.attributes.fullName)) || attrs.player || null,
    sport: attrs.sport || (setResource && setResource.attributes && setResource.attributes.sport) || null,
    year: attrs.year || (setResource && setResource.attributes && (setResource.attributes.year || setResource.attributes.releaseYear)) || null,
    manufacturer: attrs.manufacturer || (setResource && setResource.attributes && setResource.attributes.manufacturer) || null,
    brand: attrs.brand || (setResource && setResource.attributes && setResource.attributes.brand) || null,
    set: (setResource && setResource.attributes && setResource.attributes.name) || attrs.set || null,
    cardNumber: attrs.cardNumber || attrs.number || null,
    parallel: attrs.parallel || attrs.variation || null,
    frontImageUrl: attrs.frontImageUrl || (imagesRel && imagesRel.frontImageUrl) || null,
    backImageUrl: attrs.backImageUrl || (imagesRel && imagesRel.backImageUrl) || null,
    sourceUrl: attrs.url || null,
  };
}

module.exports = { searchCards, mapCardResource, isConfigured, TradingCardApiError, BASE_URL };
