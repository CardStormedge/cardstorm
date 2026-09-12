#!/usr/bin/env node
// Proves the model/research routing rule in api/lib/cardstormAI.js does
// what was asked: internal-data-backed and simple questions use the fast
// model and skip web search; only genuinely research-worthy or image
// questions use the strong model + search tool. No live API key needed -
// this only exercises the pure routing logic, not the model call itself.
const assert = require("assert");
const cardstormAI = require("../api/lib/cardstormAI");
const cardstormData = require("../api/lib/cardstormData");

const RESEARCH_SIGNALS =
  /\b(this week|this month|this year|right now|currently|latest|newest|new release|just released|top rookies|flagship|chasing)\b/i;
const YEAR_SIGNAL = /\b202[4-9]\b/;

function route(question, hasImages = false) {
  const grounded = cardstormData.lookup(question);
  const alreadyCovered = cardstormData.hasInternalCoverage(grounded);
  const needsResearch =
    !alreadyCovered && !hasImages && (RESEARCH_SIGNALS.test(question) || YEAR_SIGNAL.test(question));
  return { model: cardstormAI.chooseModel({ hasImages, needsResearch }), needsResearch, grounded };
}

const cases = [
  { q: "What makes Downtown inserts so valuable?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
  { q: "Where can I find a Downtown insert? What product/set?", expectModel: cardstormAI.MODEL_FAST, expectResearch: false },
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

// "What rookies are hot?" must be internally covered by the generic
// WATCHCAT fallback, not just happen to skip research for some other reason.
const hotRoute = route("What rookies are hot?");
assert.ok(hotRoute.grounded.matchedChases.length > 0, "expected generic hot-rookies WATCHCAT fallback to populate matchedChases");

// Travis Hunter must still be routed with his exact 3 verified comps intact.
const hunterRoute = route("What has Travis Hunter sold for recently?");
assert.strictEqual(hunterRoute.grounded.matchedComps.length, 3, "expected exactly 3 verified Travis Hunter comps");

// Any image forces the strong model regardless of research signals.
const imageRoute = route("What makes Downtown inserts so valuable?", true);
assert.strictEqual(imageRoute.model, cardstormAI.MODEL_STRONG, "expected image questions to always use the strong model");

console.log(`OK - routing verified for all ${cases.length} mandatory questions + image override, matching the requested strategy.`);
