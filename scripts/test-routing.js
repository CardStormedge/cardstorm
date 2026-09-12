#!/usr/bin/env node
// Proves the model/research routing rule in api/lib/cardstormAI.js does
// what was asked: internal-data-backed and simple questions use the fast
// model and skip web search; only genuinely research-worthy, ungrounded
// product-identity, or image questions use the strong model + search tool.
// Calls the real cardstormAI.computeRouting() (not a hand-copied regex in
// this file) so the test can never silently drift out of sync with the
// actual routing logic. No live API key needed.
const assert = require("assert");
const cardstormAI = require("../api/lib/cardstormAI");
const cardstormData = require("../api/lib/cardstormData");

function route(question, hasImages = false) {
  const groundedData = cardstormData.lookup(question);
  const { needsResearch, model } = cardstormAI.computeRouting({ question, hasImages, groundedData });
  return { model, needsResearch, groundedData };
}

const cases = [
  { q: "What makes Downtown inserts so valuable?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "Where can I find a Downtown insert? What product/set?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "Is Downtown a Topps insert?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "What product has Prizm?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "What product has Donruss Optic Downtowns?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "What are the top rookies for Topps flagship 2026?", expectModel: cardstormAI.MODEL_STRONG, expectResearch: true },
  { q: "What rookies are hot?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "What has Travis Hunter sold for recently?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "Is $75 a good price for this card?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
];

for (const c of cases) {
  const r = route(c.q);
  assert.strictEqual(r.model, c.expectModel, `model mismatch for "${c.q}": got ${r.model}, expected ${c.expectModel}`);
  assert.strictEqual(
    r.needsResearch,
    c.expectResearch,
    `research-trigger mismatch for "${c.q}": got ${r.needsResearch}, expected ${c.expectResearch}`
  );
}

// An ungrounded product-identity question (names no known insert/brand)
// must still be routed to research + the strong model rather than guessed.
{
  const r = route("What product has some totally unlisted insert called Zorbex?");
  assert.strictEqual(r.needsResearch, true, "an ungrounded identity question must trigger research");
  assert.strictEqual(r.model, cardstormAI.MODEL_STRONG);
  console.log("OK - ungrounded product-identity question routes to research + strong model");
}

// "What rookies are hot?" must be internally covered by the generic
// WATCHCAT fallback, not just happen to skip research for some other reason.
const hotRoute = route("What rookies are hot?");
assert.ok(hotRoute.groundedData.matchedChases.length > 0, "expected generic hot-rookies WATCHCAT fallback to populate matchedChases");

// Travis Hunter must still be routed with his exact 3 verified comps intact.
const hunterRoute = route("What has Travis Hunter sold for recently?");
assert.strictEqual(hunterRoute.groundedData.matchedComps.length, 3, "expected exactly 3 verified Travis Hunter comps");

// Downtown must ground to Panini, never Topps, regardless of which question names it.
const downtownRoute = route("Is Downtown a Topps insert?");
assert.strictEqual(downtownRoute.groundedData.matchedInserts[0].manufacturer, "Panini");

// Any image forces the strong model regardless of research signals.
const imageRoute = route("What makes Downtown inserts so valuable?", true);
assert.strictEqual(imageRoute.model, cardstormAI.MODEL_STRONG, "expected image questions to always use the strong model");

console.log(`OK - routing verified for all ${cases.length} mandatory questions + ungrounded-identity + image override, matching the requested strategy.`);
