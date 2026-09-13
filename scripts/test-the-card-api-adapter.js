#!/usr/bin/env node
// Tests the The Card API adapter/sale-comp normalizer. No live API key is
// available in this environment, so every provider response below is a
// HAND-BUILT MOCK using only the field names actually confirmed in public
// docs (id, title, price, listing_type, sold_at, print_run, and the ucid
// format for catalog records) - clearly labeled MOCK wherever used, never
// presented as a captured real response. See
// docs/CARD_IMAGE_PROVIDER_POC.md for exactly what is/isn't confirmed.
const assert = require("assert");
const {
  mapSaleRecord,
  mapCatalogRecord,
  scoreCardMatch,
  isConfigured,
  searchSales,
  getCatalogCardByUcid,
  TheCardApiError,
} = require("../api/lib/cardProviders/theCardApi");
const { normalizeSaleComp, classifyCompType } = require("../api/lib/cardProviders/normalizeSaleComp");

// 1. Sale-record mapping uses only confirmed field names; unconfirmed ones stay null.
{
  const MOCK_SALE_RECORD = {
    id: "sale_9f2c",
    title: "2000 SP Authentic Tom Brady RC #118 PSA 10",
    price: 118500.0,
    listing_type: "auction",
    sold_at: "2026-08-28",
    print_run: 1250,
  };
  const mapped = mapSaleRecord(MOCK_SALE_RECORD);
  assert.strictEqual(mapped.providerSaleId, "sale_9f2c");
  assert.strictEqual(mapped.salePrice, 118500.0);
  assert.strictEqual(mapped.saleDate, "2026-08-28");
  assert.strictEqual(mapped.listingType, "auction");
  assert.strictEqual(mapped.printRun, 1250);
  // Not confirmed field names - must stay null, never guessed:
  assert.strictEqual(mapped.marketplace, null);
  assert.strictEqual(mapped.grade, null);
  assert.strictEqual(mapped.imageUrl, null);
  console.log("OK - sale record maps only the confirmed fields; unconfirmed fields stay null");
}

// 2. Exact-match scoring uses structured fields, never title-similarity.
{
  const expected = { player: "Tom Brady", year: 2000, set: "SP Authentic", cardNumber: "118", grade: "PSA 10" };
  const strongMatch = { player: "Tom Brady", year: 2000, set: "SP Authentic", cardNumber: "118", grade: "PSA 10" };
  const weakMatch = { player: "Tom Brady", year: 2000, set: "SP Authentic", cardNumber: "119", grade: "PSA 9" };
  const strong = scoreCardMatch(expected, strongMatch);
  const weak = scoreCardMatch(expected, weakMatch);
  assert.strictEqual(strong.score, 1);
  assert.ok(weak.score < strong.score, "a mismatched cardNumber/grade must score lower than a full match");
  assert.ok(weak.mismatchedFields.includes("cardNumber") && weak.mismatchedFields.includes("grade"));
  console.log("OK - match scoring is field-based, correctly distinguishes a strong match from a weak one");
}

// 3. A title that LOOKS similar but has mismatched structured fields must
// NOT be treated as an exact-card match - title text carries no weight.
{
  const expected = { player: "Patrick Mahomes", year: 2017, cardNumber: "269", parallel: "Disco" };
  const similarTitleWrongParallel = { player: "Patrick Mahomes", year: 2017, cardNumber: "269", parallel: "Silver" };
  const result = scoreCardMatch(expected, similarTitleWrongParallel);
  assert.ok(result.score < 1, "a different parallel must reduce match confidence even with an identical-sounding title");
  assert.ok(result.mismatchedFields.includes("parallel"));
  console.log("OK - a similar-sounding title with a mismatched parallel is not scored as an exact match");
}

// 4. compType classification: full match -> SAME_CARD_AND_GRADE_COMP; weak -> SIMILAR_ITEM_COMP; none -> UNVERIFIED.
{
  assert.strictEqual(classifyCompType({ score: 1, comparableFieldCount: 5 }, false), "SAME_CARD_AND_GRADE_COMP");
  assert.strictEqual(classifyCompType({ score: 0.6, comparableFieldCount: 5 }, false), "SIMILAR_ITEM_COMP");
  assert.strictEqual(classifyCompType({ score: 0.2, comparableFieldCount: 5 }, false), "UNVERIFIED");
  assert.strictEqual(classifyCompType({ score: 0.3, comparableFieldCount: 5 }, true), "EXACT_CERT_CONFIRMED", "a confirmed slab-serial match always wins regardless of field score");
  console.log("OK - compType classification matches the exact-cert vs comparable vs unverified rule");
}

// 5. Active/asking-price listings are rejected as comps, never surfaced as a sale.
{
  const activeListing = mapSaleRecord({ id: "x", title: "t", price: 999, listing_type: "active", sold_at: null, print_run: null });
  const normalized = normalizeSaleComp(activeListing, { score: 1, comparableFieldCount: 3, matchedFields: [], mismatchedFields: [] }, { provider: "thecardapi.com" });
  assert.strictEqual(normalized.compType, "UNVERIFIED");
  assert.strictEqual(normalized.salePrice, null, "an active listing's price must never be surfaced as a sale price");
  assert.ok(/not a completed sale/i.test(normalized.notice));
  console.log("OK - active/asking-price listings are rejected as comps, never surfaced as sold data");
}

// 6. A genuinely completed sale with a strong match normalizes to a usable comp.
{
  const completedSale = mapSaleRecord({ id: "sale_1", title: "t", price: 93940, listing_type: "best_offer", sold_at: "2026-06-07", print_run: null });
  const matchResult = { score: 1, comparableFieldCount: 4, matchedFields: ["player", "year", "set", "cardNumber"], mismatchedFields: [] };
  const normalized = normalizeSaleComp(completedSale, matchResult, { provider: "thecardapi.com" });
  assert.strictEqual(normalized.isCompletedSale, true);
  assert.strictEqual(normalized.compType, "SAME_CARD_AND_GRADE_COMP");
  assert.strictEqual(normalized.salePrice, 93940);
  console.log("OK - a completed best_offer sale with a strong field match normalizes to a usable, honestly-labeled comp");
}

// 7. No-match case returns an honest empty shell, never a fabricated sale.
{
  const normalized = normalizeSaleComp(null, null, { provider: "thecardapi.com" });
  assert.strictEqual(normalized.salePrice, null);
  assert.strictEqual(normalized.verificationStatus, "PROVIDER_NO_MATCH");
  assert.strictEqual(normalized.notice, "No verified recent sale loaded.");
  console.log("OK - a zero-match sales search returns an honest empty shell");
}

// 8. Catalog mapping recognizes the documented ucid format and leaves
// unconfirmed fields null.
{
  const MOCK_CATALOG_RECORD = { data: { ucid: "UC-1KJZD-TZG7C-6", year: 2000 } };
  const mapped = mapCatalogRecord(MOCK_CATALOG_RECORD);
  assert.strictEqual(mapped.providerCardId, "UC-1KJZD-TZG7C-6");
  assert.strictEqual(mapped.year, 2000);
  assert.strictEqual(mapped.player, null, "player is not a confirmed catalog field name - must stay null, not guessed");
  console.log("OK - catalog record mapping recognizes the documented ucid field, leaves unconfirmed fields null");
}

// 9. isConfigured() reflects THE_CARD_API_KEY presence without exposing its value.
{
  const original = process.env.THE_CARD_API_KEY;
  delete process.env.THE_CARD_API_KEY;
  assert.strictEqual(isConfigured(), false);
  process.env.THE_CARD_API_KEY = "test-key-should-never-leak";
  assert.strictEqual(isConfigured(), true);
  if (original === undefined) delete process.env.THE_CARD_API_KEY;
  else process.env.THE_CARD_API_KEY = original;
  console.log("OK - isConfigured() correctly detects THE_CARD_API_KEY presence without exposing its value");
}

async function testNoKeyNeverFakes() {
  const original = process.env.THE_CARD_API_KEY;
  delete process.env.THE_CARD_API_KEY;
  try {
    await searchSales("2000 SP Authentic Tom Brady 118");
    throw new Error("expected searchSales to throw when no key is configured");
  } catch (e) {
    assert.ok(e instanceof TheCardApiError);
    assert.ok(/THE_CARD_API_KEY is not set/.test(e.message));
    console.log("OK - with no API key configured, searchSales throws rather than faking a response");
  } finally {
    if (original === undefined) delete process.env.THE_CARD_API_KEY;
    else process.env.THE_CARD_API_KEY = original;
  }
}

async function testCatalogPaidPlanHandling() {
  process.env.THE_CARD_API_KEY = "test-key";
  const fakeFetch = async () => ({ ok: false, status: 402, json: async () => ({}) });
  try {
    await getCatalogCardByUcid("UC-1KJZD-TZG7C-6", { fetchImpl: fakeFetch });
    throw new Error("expected getCatalogCardByUcid to throw on a 402");
  } catch (e) {
    assert.ok(e instanceof TheCardApiError);
    assert.strictEqual(e.reason, "CATALOG_REQUIRES_PAID_PLAN");
    console.log("OK - a 402 from the catalog endpoint is reported as a paid-plan gate, not a fabricated empty catalog");
  }
}

async function testProviderHttpErrorHandling() {
  process.env.THE_CARD_API_KEY = "test-key";
  const fakeFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  try {
    await searchSales("query", { fetchImpl: fakeFetch });
    throw new Error("expected searchSales to throw on a 500");
  } catch (e) {
    assert.ok(e instanceof TheCardApiError);
    assert.strictEqual(e.status, 500);
    console.log("OK - a provider 500 becomes a typed error, never a fabricated success");
  }
}

async function testNoSecretLeakage() {
  process.env.THE_CARD_API_KEY = "super-secret-thecardapi-value-999";
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ data: [{ id: "sale_1", title: "t", price: 100, listing_type: "auction", sold_at: "2026-01-01", print_run: null }] }),
  });
  const raw = await searchSales("query", { fetchImpl: fakeFetch });
  const mapped = mapSaleRecord(raw.data[0]);
  const normalized = normalizeSaleComp(mapped, { score: 1, comparableFieldCount: 1, matchedFields: [], mismatchedFields: [] }, { provider: "thecardapi.com" });
  const serialized = JSON.stringify(normalized);
  assert.ok(!serialized.includes("super-secret-thecardapi-value-999"), "the API key must never appear in a normalized comp record");
  console.log("OK - the configured THE_CARD_API_KEY never leaks into a normalized sale-comp record");
}

(async () => {
  await testNoKeyNeverFakes();
  await testCatalogPaidPlanHandling();
  await testProviderHttpErrorHandling();
  await testNoSecretLeakage();
  console.log("\nALL THE-CARD-API-ADAPTER TESTS PASSED");
})().catch((err) => {
  console.error("FAIL -", err.message);
  process.exit(1);
});
