// cardstormData.lookup(question) - grounds free-form questions against the
// real, on-disk verified checklist/product JSON that ships with the repo
// (data/football/<year>/<brand>.json, data/products/football/<year>.json,
// data/checklists/football/<year>/*.json, data/goat/goat-vault.json).
//
// NOTE ON SCOPE: this does NOT have access to COMPS / WATCHCAT / the
// CHECKLIST_MANIFEST used for Team Hunt - those are hardcoded client-side
// constants inside app.html, not separate data files, so the frontend
// continues to answer those questions locally (fast path) before ever
// calling this backend. This module only sees genuine on-disk JSON.
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
  const corpus = { products: [], checklistCards: [], goat: null };

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

  cache = corpus;
  return corpus;
}

function normalize(s) {
  return (s || "").toLowerCase();
}

// Best-effort, non-fuzzy grounding: find checklist cards / products whose
// player or product name appears in the question text. This is deliberately
// conservative - a miss just means the model falls through to general
// knowledge / web research, which is fine; a false match would inject wrong
// "verified" data, which is not.
function lookup(question) {
  const corpus = loadCorpus();
  const q = normalize(question);
  if (!q) return { matchedCards: [], matchedProducts: [] };

  const matchedCards = corpus.checklistCards
    .filter((c) => c.player && q.includes(normalize(c.player)))
    .slice(0, 8);

  const matchedProducts = corpus.products
    .filter((p) => {
      const label = `${p.brand || ""} ${p.product || ""}`.trim();
      return label && q.includes(normalize(label));
    })
    .slice(0, 5);

  return { matchedCards, matchedProducts };
}

module.exports = { lookup };
