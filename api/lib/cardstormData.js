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
  const corpus = { products: [], checklistCards: [], goat: null, comps: [], watchcat: [] };

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

  cache = corpus;
  return corpus;
}

function normalize(s) {
  return (s || "").toLowerCase();
}

// Best-effort, non-fuzzy grounding: find checklist cards / products / comps
// whose player or product name appears in the question text. This is
// deliberately conservative - a miss just means the model falls through to
// general knowledge / web research, which is fine; a false match would
// inject wrong "verified" data, which is not.
function lookup(question) {
  const corpus = loadCorpus();
  const q = normalize(question);
  if (!q) return { matchedCards: [], matchedProducts: [], matchedComps: [], matchedChases: [] };

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
  const matchedChases = corpus.watchcat.filter((w) => q.includes(normalize(w[0])));

  return { matchedCards, matchedProducts, matchedComps, matchedChases };
}

module.exports = { lookup };
