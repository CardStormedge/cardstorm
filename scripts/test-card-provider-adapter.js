#!/usr/bin/env node
// Tests the card-image-provider POC adapter/normalizer. No live API key is
// available in this environment, so every "response" fed to the mapper
// below is a HAND-BUILT SHAPE based on tradingcardapi.com's documented
// JSON:API entity model (Cards/Sets/Players/Teams/Card Images), NOT a
// captured real response - clearly labeled as such wherever it's used.
// This proves the adapter/normalizer logic is correct; it does NOT prove
// the exact attribute key names match the live API (see the TODO markers
// in api/lib/cardProviders/tradingCardApi.js and
// docs/CARD_IMAGE_PROVIDER_POC.md for why that gap exists and can't be
// closed without real credentials).
const assert = require("assert");
const { normalizeCard, VALID_VERIFICATION_STATUSES } = require("../api/lib/cardProviders/normalizeCard");
const { mapCardResource, isConfigured, searchCards, TradingCardApiError } = require("../api/lib/cardProviders/tradingCardApi");

// 1. Normalization: a fully-populated documented-shape record maps cleanly.
{
  const docShapeResource = {
    id: "card_abc123",
    type: "cards",
    attributes: {
      year: 2000,
      cardNumber: "118",
      parallel: null,
      frontImageUrl: "https://cdn.example/front.jpg",
      backImageUrl: "https://cdn.example/back.jpg",
      url: "https://tradingcardapi.com/cards/card_abc123",
    },
    relationships: {
      player: { data: { type: "players", id: "player_1" } },
      set: { data: { type: "sets", id: "set_1" } },
    },
  };
  const included = [
    { type: "players", id: "player_1", attributes: { name: "Tom Brady" } },
    { type: "sets", id: "set_1", attributes: { name: "SP Authentic", sport: "football", manufacturer: "Upper Deck", brand: "SP Authentic" } },
  ];
  const mapped = mapCardResource(docShapeResource, included);
  const normalized = normalizeCard(mapped, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_MATCHED" });
  assert.strictEqual(normalized.player, "Tom Brady");
  assert.strictEqual(normalized.sport, "football");
  assert.strictEqual(normalized.year, 2000);
  assert.strictEqual(normalized.cardNumber, "118");
  assert.strictEqual(normalized.frontImageUrl, "https://cdn.example/front.jpg");
  assert.strictEqual(normalized.verificationStatus, "PROVIDER_MATCHED");
  console.log("OK - a fully-populated documented-shape record normalizes correctly");
}

// 2. Missing fields stay null, never guessed/defaulted.
{
  const sparseResource = { id: "card_sparse", type: "cards", attributes: {}, relationships: {} };
  const mapped = mapCardResource(sparseResource, []);
  const normalized = normalizeCard(mapped, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_MATCHED" });
  assert.strictEqual(normalized.player, null);
  assert.strictEqual(normalized.frontImageUrl, null);
  assert.strictEqual(normalized.backImageUrl, null);
  assert.strictEqual(normalized.parallel, null);
  console.log("OK - missing provider fields stay null, never fabricated");
}

// 3. normalizeCard rejects an invalid verificationStatus rather than silently accepting it.
{
  assert.throws(() => normalizeCard(null, { provider: "x", verificationStatus: "MADE_UP_STATUS" }), /invalid verificationStatus/);
  console.log("OK - invalid verificationStatus is rejected, not silently accepted");
}

// 4. Ambiguous search (multiple candidate records) - the POC endpoint logic
// (mirrored here) must never auto-pick one; every candidate is returned
// with PROVIDER_AMBIGUOUS, not a single false-confident match.
{
  const candidates = [
    { id: "card_1", type: "cards", attributes: { year: 2017, cardNumber: "269" }, relationships: {} },
    { id: "card_2", type: "cards", attributes: { year: 2017, cardNumber: "269b" }, relationships: {} },
  ];
  const status = candidates.length > 1 ? "PROVIDER_AMBIGUOUS" : "PROVIDER_MATCHED";
  const results = candidates.map((c) => normalizeCard(mapCardResource(c, []), { provider: "tradingcardapi.com", verificationStatus: status }));
  assert.strictEqual(results.length, 2);
  assert.ok(results.every((r) => r.verificationStatus === "PROVIDER_AMBIGUOUS"));
  assert.notStrictEqual(results[0].providerCardId, results[1].providerCardId, "duplicate/ambiguous records must stay distinct, never merged");
  console.log("OK - ambiguous multi-candidate search returns every candidate flagged, never auto-merged");
}

// 5. No-match case produces an honest empty-shell record.
{
  const normalized = normalizeCard(null, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_NO_MATCH" });
  assert.strictEqual(normalized.player, null);
  assert.strictEqual(normalized.verificationStatus, "PROVIDER_NO_MATCH");
  console.log("OK - a zero-match search returns an honest empty shell, not a fabricated card");
}

// 6. isConfigured() correctly reflects whether TRADING_CARD_API_KEY is set,
// without ever printing or returning the key's value.
{
  const original = process.env.TRADING_CARD_API_KEY;
  delete process.env.TRADING_CARD_API_KEY;
  assert.strictEqual(isConfigured(), false, "isConfigured() must be false with no key set");
  process.env.TRADING_CARD_API_KEY = "test-key-value-should-never-leak";
  assert.strictEqual(isConfigured(), true, "isConfigured() must be true once a key is set");
  if (original === undefined) delete process.env.TRADING_CARD_API_KEY;
  else process.env.TRADING_CARD_API_KEY = original;
  console.log("OK - isConfigured() correctly detects key presence without ever exposing its value");
}

// 7. Provider HTTP-error handling: a non-OK response becomes a typed
// TradingCardApiError, not a silently-empty or fabricated success.
async function testProviderErrorHandling() {
  process.env.TRADING_CARD_API_KEY = "test-key";
  const fakeFetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  try {
    await searchCards("query", { fetchImpl: fakeFetch });
    throw new Error("expected searchCards to throw on a non-OK response");
  } catch (e) {
    assert.ok(e instanceof TradingCardApiError, "expected a TradingCardApiError");
    assert.strictEqual(e.status, 401);
    console.log("OK - a provider HTTP error becomes a typed error, never a fabricated success");
  }
}

// 8. No-key case: searchCards() throws an honest, typed error (never a
// fake result) - proves the "don't fake responses" rule is code, not just
// a promise in a doc.
async function testNoKeyNeverFakes() {
  const original = process.env.TRADING_CARD_API_KEY;
  delete process.env.TRADING_CARD_API_KEY;
  try {
    await searchCards("2000 SP Authentic Tom Brady 118");
    throw new Error("expected searchCards to throw when no key is configured");
  } catch (e) {
    assert.ok(e instanceof TradingCardApiError);
    assert.ok(/TRADING_CARD_API_KEY is not set/.test(e.message));
    console.log("OK - with no API key configured, searchCards throws rather than faking a response");
  } finally {
    if (original === undefined) delete process.env.TRADING_CARD_API_KEY;
    else process.env.TRADING_CARD_API_KEY = original;
  }
}

// 9. No-secret-leakage: the normalized object and a JSON-stringified POC
// response never contain the raw API key, under any field name.
async function testNoSecretLeakage() {
  process.env.TRADING_CARD_API_KEY = "super-secret-value-12345";
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({
      data: [{ id: "card_1", type: "cards", attributes: { year: 2018, cardNumber: "RA-SO" }, relationships: {} }],
      included: [],
    }),
  });
  const raw = await searchCards("Ohtani RA-SO", { fetchImpl: fakeFetch });
  const mapped = mapCardResource(raw.data[0], raw.included);
  const normalized = normalizeCard(mapped, { provider: "tradingcardapi.com", verificationStatus: "PROVIDER_MATCHED" });
  const serialized = JSON.stringify(normalized);
  assert.ok(!serialized.includes("super-secret-value-12345"), "the API key must never appear in a normalized/serialized card record");
  console.log("OK - the configured API key never leaks into a normalized card record or its JSON serialization");
}

(async () => {
  await testProviderErrorHandling();
  await testNoKeyNeverFakes();
  await testNoSecretLeakage();
  console.log("\nALL CARD-PROVIDER-ADAPTER TESTS PASSED");
})().catch((err) => {
  console.error("FAIL -", err.message);
  process.exit(1);
});
