#!/usr/bin/env node
// Proves the product/insert/manufacturer identity fixes: grounding matches
// conservatively, Downtown never maps to Topps, and the deterministic
// conflict guard overrides a wrong model draft rather than trusting it.
// No live API key needed - this only exercises the pure grounding/guard
// logic, not a real model call.
const assert = require("assert");
const cardstormData = require("../api/lib/cardstormData");
const cardstormAI = require("../api/lib/cardstormAI");

// 1. Downtown grounds to Panini, never Topps.
{
  const g = cardstormData.lookup("Where can I find a Downtown insert? What product/set?");
  assert.strictEqual(g.matchedInserts.length, 1, "expected exactly one matched insert for Downtown");
  assert.strictEqual(g.matchedInserts[0].name, "Downtown");
  assert.strictEqual(g.matchedInserts[0].manufacturer, "Panini", "Downtown must be grounded as Panini, not Topps");
  console.log("OK - Downtown grounds to Panini");
}

// 2. Plural form ("Downtowns") still grounds.
{
  const g = cardstormData.lookup("What product has Donruss Optic Downtowns?");
  assert.strictEqual(g.matchedInserts.length, 1, "expected plural 'Downtowns' to still match the Downtown insert entry");
  assert.deepStrictEqual(
    g.matchedBrands.map((b) => b.brand).sort(),
    ["Donruss", "Donruss Optic"],
    "expected both Donruss and Donruss Optic to be grounded"
  );
  console.log("OK - plural insert name and multi-brand match both work");
}

// 3. Identity-question detector fires only on the right phrasing.
{
  assert.strictEqual(cardstormData.isProductIdentityQuestion("Is Downtown a Topps insert?"), true);
  assert.strictEqual(cardstormData.isProductIdentityQuestion("What product has Prizm?"), true);
  assert.strictEqual(cardstormData.isProductIdentityQuestion("What makes Downtown inserts so valuable?"), false);
  console.log("OK - product-identity question detector matches the intended phrasings only");
}

// 4. An ungrounded identity question (naming an insert/product CardStorm's
// table doesn't cover) must be treated as needing research, not guessed.
{
  const q = "What product has some totally unlisted insert called Zorbex?";
  const g = cardstormData.lookup(q);
  assert.strictEqual(cardstormData.hasInternalCoverage(g), false, "an unknown insert must not be reported as covered");
  assert.strictEqual(cardstormData.isProductIdentityQuestion(q), true);
  console.log("OK - unknown insert correctly falls through to 'needs research', not fabricated");
}

// 5. Deterministic conflict guard overrides a wrong draft, leaves a right one alone.
{
  const grounded = cardstormData.lookup("Where can I find a Downtown insert? What product/set?");
  const wrongDraft = "Downtown is a Topps insert found in Topps Series 1 and Topps Chrome.";
  const conflict = cardstormAI.detectManufacturerConflict(wrongDraft, grounded);
  assert.ok(conflict, "expected a conflict to be detected for the wrong draft");
  assert.strictEqual(conflict.wrongManufacturer, "Topps");
  const corrected = cardstormAI.buildInsertIdentityAnswer(conflict.insert);
  assert.ok(/Panini/.test(corrected) && !/is a Topps/.test(corrected), "corrected answer must state Panini, not Topps");

  const rightDraft = "Downtown is a Panini case-hit insert found in Donruss and Donruss Optic.";
  assert.strictEqual(
    cardstormAI.detectManufacturerConflict(rightDraft, grounded),
    null,
    "a correct draft must not be flagged as a conflict"
  );
  console.log("OK - manufacturer-conflict guard corrects a wrong draft and leaves a correct one untouched");
}

// 6. Travis Hunter comps and the hot-rookies/current-research routing must
// be unaffected by any of the above (regression guard for prior fixes).
{
  const hunter = cardstormData.lookup("What has Travis Hunter sold for recently?");
  assert.strictEqual(hunter.matchedComps.length, 3, "Travis Hunter must still have exactly 3 verified comps");
  assert.strictEqual(cardstormData.hasInternalCoverage(hunter), true);

  const hot = cardstormData.lookup("What rookies are hot?");
  assert.ok(hot.matchedChases.length > 0, "generic hot-rookies fallback must still populate matchedChases");

  const current = cardstormData.lookup("What are the top rookies for Topps flagship 2026?");
  assert.strictEqual(cardstormData.hasInternalCoverage(current), false, "current-research question must remain uncovered internally");
  console.log("OK - Travis Hunter parity and hot-rookies/current-research routing unaffected");
}

console.log("\nALL PRODUCT-GROUNDING TESTS PASSED");
