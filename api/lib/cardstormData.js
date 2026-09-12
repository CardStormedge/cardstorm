// cardstormData.lookup(question) - grounds free-form questions against the
// real, on-disk verified checklist/product/comp JSON that ships with the
// repo (data/football/<year>/<brand>.json, data/products/football/<year>.json,
// data/goat/goat-vault.json, data/intelligence/comps.json,
// data/intelligence/watchcat.json).
//
// data/intelligence/comps.json and data/intelligence/watchcat.json are an
// exact, verbatim copy of app.html's COMPS/WATCHCAT constants - the
// frontend still owns the fast, synchronous local-match path (COMPS[0] is
// read on the very first homepage render, so switching that to an async
// fetch was rejected as too risky - see scripts/check-comps-sync.js),
// but the backend now reads the same verified sold-comp data from here
// instead of having no access to it at all. Run
// `node scripts/check-comps-sync.js` (and scripts/test-comps-parity.js)
// to confirm the two copies still match exactly before merging any change
// to either one.
const fs = require("fs");
const path = require("path");

const DATA_ROOT = path.join(__dirname, "..", "..", "data");

let cache = null;

function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return null;
  }
}

function loadCorpus() {
  if (cache) return cache;
  const corpus = { products: [], checklistCards: [], goat: null, comps: [], watchcat: [], productKnowledge: null };

  // data/products/football/<year>.json - sealed product registry
  const productsDir = path.join(DATA_ROOT, "products", "football");
  if (fs.existsSync(productsDir)) {
    for (const f of fs.readdirSync(productsDir)) {
      if (!f.endsWith(".json")) continue;
      const doc = safeReadJSON(path.join(productsDir, f));
      if (doc && Array.isArray(doc.products)) corpus.products.push(...doc.products);
    }
  }

  // data/football/<year>/<brand>.json - player/card-level checklist data
  const footballDir = path.join(DATA_ROOT, "football");
  if (fs.existsSync(footballDir)) {
    for (const year of fs.readdirSync(footballDir)) {
      const yearDir = path.join(footballDir, year);
      if (!fs.statSync(yearDir).isDirectory()) continue;
      for (const f of fs.readdirSync(yearDir)) {
        if (!f.endsWith(".json")) continue;
        const doc = safeReadJSON(path.join(yearDir, f));
        if (!doc || !doc.categories) continue;
        for (const [categoryName, cat] of Object.entries(doc.categories)) {
          if (!cat || !Array.isArray(cat.cards)) continue;
          for (const card of cat.cards) {
            corpus.checklistCards.push({
              year: doc.product && doc.product.year,
              brand: doc.product && doc.product.brand,
              set: doc.product && doc.product.set,
              displayName: doc.product && doc.product.displayName,
              category: categoryName,
              ...card,
            });
          }
        }
      }
    }
  }

  // data/goat/goat-vault.json - editorial hobby-icon roster (bio fields only)
  corpus.goat = safeReadJSON(path.join(DATA_ROOT, "goat", "goat-vault.json"));

  // data/intelligence/*.json - CardStorm's verified sold comps + curated
  // chase watchlist, kept in exact sync with app.html (see file header).
  const compsDoc = safeReadJSON(path.join(DATA_ROOT, "intelligence", "comps.json"));
  if (compsDoc && Array.isArray(compsDoc.comps)) corpus.comps = compsDoc.comps;
  const watchDoc = safeReadJSON(path.join(DATA_ROOT, "intelligence", "watchcat.json"));
  if (watchDoc && Array.isArray(watchDoc.watchcat)) corpus.watchcat = watchDoc.watchcat;

  // data/intelligence/product-knowledge.json - small hand-curated
  // manufacturer/brand/insert facts (e.g. "Downtown is Panini, not
  // Topps"), treated as ground truth the model is never allowed to
  // contradict. See that file's own _schema note for why this is safe to
  // hardcode (stable, undisputed hobby facts, kept intentionally short).
  corpus.productKnowledge = safeReadJSON(path.join(DATA_ROOT, "intelligence", "product-knowledge.json"));

  cache = corpus;
  return corpus;
}

function normalize(s) {
  return (s || "").toLowerCase();
}

// Whole-word/phrase containment (not substring) - so "Prizm" doesn't match
// inside some future "Prizmatic" brand, and matching stays conservative per
// the "false positives are worse than misses" rule for this data.
function containsPhrase(haystackLower, phrase) {
  const re = new RegExp(`\\b${phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return re.test(haystackLower);
}

// Same as containsPhrase but also matches a simple trailing plural ("s") -
// e.g. "Downtowns" should still ground to the "Downtown" insert entry.
// Kept as its own function (rather than loosening containsPhrase generally)
// so brand-name matching stays fully exact.
function containsPhraseOrPlural(haystackLower, phrase) {
  const escaped = phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}s?\\b`);
  return re.test(haystackLower);
}

// Best-effort, non-fuzzy grounding: find checklist cards / products / comps
// whose player or product name appears in the question text. This is
// deliberately conservative - a miss just means the model falls through to
// general knowledge / web research, which is fine; a false match would
// inject wrong "verified" data, which is not.
function lookup(question) {
  const corpus = loadCorpus();
  const q = normalize(question);
  if (!q) {
    return { matchedCards: [], matchedProducts: [], matchedComps: [], matchedChases: [], matchedInserts: [], matchedBrands: [] };
  }

  const matchedCards = corpus.checklistCards
    .filter((c) => c.player && q.includes(normalize(c.player)))
    .slice(0, 8);

  const matchedProducts = corpus.products
    .filter((p) => {
      const label = `${p.brand || ""} ${p.product || ""}`.trim();
      return label && q.includes(normalize(label));
    })
    .slice(0, 5);

  // comps.json record shape: [player, price, cardDescription, grade, saleDate, source, verifyUrl]
  const matchedComps = corpus.comps.filter((c) => q.includes(normalize(c[0])));

  // watchcat.json record shape: [player, sport, hit1, hit2, hit3] - curated
  // chase suggestions, never to be presented as verified checklist data.
  let matchedChases = corpus.watchcat.filter((w) => q.includes(normalize(w[0])));

  // Generic "which rookies are hot" style questions name no specific
  // player, so the name-match above finds nothing even though CardStorm
  // has real curated coverage for exactly this question - mirrors the
  // frontend's ackHotRookiesHTML() fast path (same regex, same football
  // filter, same slice) so the backend doesn't send a question to live
  // web research that CardStorm's own data already answers.
  const GENERIC_HOT_ROOKIES = /hot rookie|rookies.*hot|which rookies/i;
  if (!matchedChases.length && GENERIC_HOT_ROOKIES.test(question || "")) {
    matchedChases = corpus.watchcat.filter((w) => w[1] === "football").slice(0, 6);
  }

  // product-knowledge.json - conservative whole-word match against the
  // small curated insert/brand table (see that file's header). A miss
  // just falls through to research/general knowledge; a false match would
  // inject a wrong "ground truth" manufacturer, which is the exact failure
  // this exists to prevent - so matching stays exact and small on purpose.
  const pk = corpus.productKnowledge;
  const matchedInserts = pk && Array.isArray(pk.inserts) ? pk.inserts.filter((i) => containsPhraseOrPlural(q, i.name)) : [];
  const matchedBrands = [];
  if (pk && pk.manufacturers) {
    for (const [manufacturer, info] of Object.entries(pk.manufacturers)) {
      for (const brand of info.brands || []) {
        if (containsPhrase(q, brand)) matchedBrands.push({ brand, manufacturer });
      }
    }
  }

  return { matchedCards, matchedProducts, matchedComps, matchedChases, matchedInserts, matchedBrands };
}

// True when CardStorm's own verified/curated data already has enough to
// answer the question, so the caller should skip live web research even if
// the question superficially looks time-sensitive.
function hasInternalCoverage(groundedData) {
  return !!(
    groundedData &&
    (groundedData.matchedComps.length ||
      groundedData.matchedChases.length ||
      groundedData.matchedCards.length ||
      groundedData.matchedProducts.length ||
      groundedData.matchedInserts.length ||
      groundedData.matchedBrands.length)
  );
}

// Questions that ask "what/which product/set/box is X in" or "is X a
// <manufacturer> product" name a specific manufacturer/product/insert
// identity - these must never be answered from ungrounded model memory.
// When CardStorm's own product-knowledge table doesn't cover the named
// entity, the caller should route to live research (an authoritative
// manufacturer source) rather than let the model guess with false
// confidence - this is what caught the "Downtown is a Topps insert" error.
const PRODUCT_IDENTITY_SIGNALS =
  /\b(what product|what set|what box|which product|which set|where (can|do) i find|is\s+.+\s+a\s+(topps|panini)\s+(product|insert)|what company makes|which manufacturer)\b/i;

function isProductIdentityQuestion(question) {
  return PRODUCT_IDENTITY_SIGNALS.test(question || "");
}

module.exports = { lookup, hasInternalCoverage, isProductIdentityQuestion };
