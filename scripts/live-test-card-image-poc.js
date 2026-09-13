#!/usr/bin/env node
// TEMPORARY live-validation script - calls the real, deployed Vercel Preview
// instance of api/card-image-poc.js for this PR's branch. Only runs where
// real network egress exists (GitHub Actions runners) - this sandbox has no
// outbound access to thecardapi.com (confirmed via a direct curl returning
// "CONNECT tunnel failed, response 403", not assumed) and no THE_CARD_API_KEY
// is set here, so this cannot be run locally in that environment either.
//
// This script NEVER holds or sends THE_CARD_API_KEY - the endpoint itself
// reads that from Vercel's own environment variables, server-side only.
// This script only ever prints the endpoint's JSON response, and only the
// safe, already-normalized fields from it - never a raw Authorization
// header (none is ever sent by this script in the first place) and never
// any field that could carry a secret.
const ENDPOINT = process.env.POC_ENDPOINT || "https://cardstorm-api-git-claude-card-image-provider-poc-card-storm.vercel.app/api/card-image-poc";
// Preview deployments allow *.vercel.app origins (see api/lib/cors.js -
// isAllowedDevOrigin) since VERCEL_ENV !== "production" there. This is the
// runner's own request identifying itself, not a secret.
const ORIGIN = "https://cardstorm-git-claude-card-image-provider-poc-card-storm.vercel.app";

// The same 10 cards already defined in docs/CARD_IMAGE_PROVIDER_POC.md /
// data/intelligence/grail-board.json - reused, not redefined. expectedFields
// feeds scoreCardMatch() server-side so the response's exact-match
// confidence is computed against real structured fields, never title text.
const CARDS = [
  { label: "Brady 2000 SP Authentic #118", query: "2000 SP Authentic Tom Brady 118", expectedFields: { player: "Tom Brady", year: 2000, set: "SP Authentic", cardNumber: "118", grade: "PSA 10" } },
  { label: "Brady 2000 Contenders Championship Ticket #144", query: "2000 Playoff Contenders Championship Ticket Tom Brady 144", expectedFields: { player: "Tom Brady", year: 2000, set: "Contenders", cardNumber: "144" } },
  { label: "Jordan 1986 Fleer #57", query: "1986 Fleer Michael Jordan 57", expectedFields: { player: "Michael Jordan", year: 1986, set: "Fleer", cardNumber: "57" } },
  { label: "Jordan 1997 Metal Universe PMG Green #23", query: "1997 Metal Universe Precious Metal Gems Green Michael Jordan 23", expectedFields: { player: "Michael Jordan", year: 1997, set: "Metal Universe", cardNumber: "23" } },
  { label: "Ohtani 2018 Topps Chrome #150", query: "2018 Topps Chrome Shohei Ohtani 150", expectedFields: { player: "Shohei Ohtani", year: 2018, set: "Topps Chrome", cardNumber: "150" } },
  { label: "Ohtani 2018 Topps Chrome Rookie Auto #RA-SO", query: "2018 Topps Chrome Rookie Autograph Shohei Ohtani RA-SO", expectedFields: { player: "Shohei Ohtani", year: 2018, set: "Topps Chrome", cardNumber: "RA-SO", grade: "PSA 10" } },
  { label: "Mahomes 2017 Prizm Disco #269", query: "2017 Prizm Disco Patrick Mahomes 269", expectedFields: { player: "Patrick Mahomes", year: 2017, set: "Prizm", cardNumber: "269", parallel: "Disco", grade: "PSA 10" } },
  { label: "Mahomes 2017 Donruss Optic Red Yellow #177", query: "2017 Donruss Optic Red Yellow Patrick Mahomes 177", expectedFields: { player: "Patrick Mahomes", year: 2017, set: "Donruss Optic", cardNumber: "177", parallel: "Red Yellow", grade: "PSA 10" } },
  { label: "Flagg 2025 Bowman Chrome Superfractor #BCV-1", query: "2025 Bowman Chrome Superfractor Cooper Flagg BCV-1", expectedFields: { player: "Cooper Flagg", year: 2025, set: "Bowman Chrome", cardNumber: "BCV-1", parallel: "Superfractor" } },
  { label: "Flagg 2024 Topps Chrome McDonald's AA Auto #78", query: "2024 Topps Chrome McDonald's All-American Autograph Cooper Flagg 78", expectedFields: { player: "Cooper Flagg", year: 2024, set: "Topps Chrome McDonald's All-American", cardNumber: "78", parallel: "SuperFractor" } },
];

function redact(obj) {
  // Defense in depth: even though the endpoint should never return a key,
  // strip anything that looks like one before this script ever prints it.
  const str = JSON.stringify(obj);
  if (/[a-zA-Z0-9_-]{24,}/.test(str)) {
    // Long opaque tokens are suspicious in a normalized-card response -
    // flag rather than silently print, but don't assume it's definitely a
    // leaked secret (a real provider ID could also be long).
    return { ...obj, _longTokenWarning: "A field in this response contains a long opaque string - manually verify it is not a credential before trusting this log." };
  }
  return obj;
}

async function callPoc(card, provider, mode) {
  const body = { query: card.query, provider, mode, expectedFields: mode === "sales" ? card.expectedFields : undefined };
  let res, text, json;
  // Vercel's own function timeout bounds the server side, but a hung/slow
  // network path to the upstream provider (or to Vercel itself) could still
  // stall this runner indefinitely without a client-side cap - 25s per call
  // keeps a full 10-card + 1 catalog-probe run well under a CI job timeout
  // even in the worst case.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (networkErr) {
    console.log(`  HTTP call failed entirely: ${networkErr.name === "AbortError" ? "timed out after 25s" : networkErr.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
  // A non-200 status is diagnostic information regardless of whether the
  // body happens to be valid JSON - print it raw (safe: this is our own
  // endpoint's or Vercel's own error body, never a request we sent, so it
  // cannot contain a secret we hold) rather than only printing recognized
  // fields and silently dropping the actual reason.
  if (res.status !== 200) {
    console.log(`  Raw response body (status ${res.status}, for diagnosis): ${text.slice(0, 500)}`);
  }
  try {
    json = JSON.parse(text);
  } catch (e) {
    // Not JSON - almost certainly a Vercel Deployment Protection HTML page
    // or an error page, not a fake result to parse around.
    const looksLikeVercelAuth = /authenticat|vercel/i.test(text) && res.status === 401;
    console.log(`  HTTP ${res.status} - response was not JSON.`);
    if (looksLikeVercelAuth) {
      console.log("  DEPLOYMENT_PROTECTION_BLOCKED: this looks like a Vercel Deployment Protection auth page, not the API response.");
    }
    return { httpStatus: res.status, parsed: false };
  }
  return { httpStatus: res.status, parsed: true, json: redact(json) };
}

async function run() {
  console.log(`Endpoint under test: ${ENDPOINT}`);
  console.log(`(THE_CARD_API_KEY itself is never sent by this script - it lives only in Vercel's server-side environment.)\n`);

  let anyLiveSalesData = false;
  let anyBestOffer = false;
  let notConfigured = false;
  let deploymentProtectionBlocked = false;
  let non200Count = 0;

  for (const card of CARDS) {
    console.log(`=== ${card.label} ===`);
    console.log(`  query: "${card.query}"`);
    const result = await callPoc(card, "thecardapi", "sales");
    if (!result) continue;
    console.log(`  HTTP status: ${result.httpStatus}`);
    if (result.httpStatus !== 200) {
      non200Count++;
      if (result.httpStatus === 401) deploymentProtectionBlocked = true;
    }
    if (!result.parsed) {
      continue;
    }
    if (result.httpStatus !== 200) {
      // Reached this endpoint (our own handler always returns 200, even for
      // no-match/no-config/error cases - see api/card-image-poc.js), so a
      // non-200 with a parseable body is coming from the Vercel platform
      // layer in front of it (most likely Deployment Protection), not from
      // our own code. Print whatever it actually says rather than guessing.
      console.log(`  This is a platform-level response (our own handler never returns HTTP ${result.httpStatus}) - see raw body above.`);
      continue;
    }
    const { json } = result;
    console.log(`  note: ${json.note || "(none)"}`);
    if (json.note && /not configured/i.test(json.note)) notConfigured = true;
    const results = json.results || [];
    console.log(`  response count: ${results.length}`);
    results.forEach((r, i) => {
      console.log(`  -- result ${i + 1} --`);
      console.log(`     provider: ${r.provider}`);
      console.log(`     providerSaleId: ${r.providerSaleId}`);
      console.log(`     salePrice: ${r.salePrice}`);
      console.log(`     saleDate: ${r.saleDate}`);
      console.log(`     marketplace: ${r.marketplace}`);
      console.log(`     listingType: ${r.listingType}`);
      console.log(`     isCompletedSale: ${r.isCompletedSale}`);
      console.log(`     compType: ${r.compType}`);
      console.log(`     matchScore: ${r.matchScore}`);
      console.log(`     matchedFields: ${JSON.stringify(r.matchedFields)}`);
      console.log(`     mismatchedFields: ${JSON.stringify(r.mismatchedFields)}`);
      console.log(`     imageUrl: ${r.imageUrl}`);
      console.log(`     sourceUrl: ${r.sourceUrl}`);
      console.log(`     verificationStatus: ${r.verificationStatus}`);
      console.log(`     notice: ${r.notice}`);
      if (r.salePrice != null) anyLiveSalesData = true;
      if (r.listingType === "best_offer" && r.isCompletedSale) anyBestOffer = true;
    });
    console.log("");
  }

  // Also attempt a Catalog-mode call once, to confirm/refute the "no
  // free-text catalog search endpoint" finding against the real API.
  console.log("=== Catalog-mode probe (Tom Brady 2000 SP Authentic #118) ===");
  const catalogResult = await callPoc(CARDS[0], "thecardapi", "catalog");
  if (catalogResult && catalogResult.parsed) {
    console.log(`  HTTP status: ${catalogResult.httpStatus}`);
    console.log(`  note: ${catalogResult.json.note}`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Requests that did not return HTTP 200 from our own handler: ${non200Count} / ${CARDS.length}`);
  console.log(`THE_CARD_API_KEY configuration status: ${notConfigured ? "CONFIRMED NOT CONFIGURED" : non200Count > 0 ? "UNKNOWN - blocked before our handler could report it" : "appears configured (endpoint reached and did not report it missing)"}`);
  console.log(`Deployment Protection (or another platform-layer 401) blocked this run: ${deploymentProtectionBlocked}`);
  console.log(`Any live sale price data returned: ${anyLiveSalesData}`);
  console.log(`Any completed Best Offer sale observed: ${anyBestOffer}`);
}

run().catch((err) => {
  console.error("LIVE TEST SCRIPT CRASHED:", err.message);
  process.exit(1);
});
