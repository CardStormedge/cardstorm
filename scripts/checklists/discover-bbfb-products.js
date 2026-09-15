// scripts/checklists/discover-bbfb-products.js
//
// TEMPORARY diagnostic tool, run only from
// .github/workflows/pr30-topps-live-ingestion-test.yml on a GitHub-hosted
// runner (this sandbox's own network egress is blocked to topps.com/
// cdn.shopify.com - see fetch-source.js's header comment).
//
// Purpose: discover REAL basketball and football checklist-PDF URLs beyond
// the two products already persisted (2025-26 Topps Basketball, 2024 Topps
// Chrome Football), by fetching topps.com's own real checklist index page(s)
// and reading their actual <a href> links - never guessing a URL pattern.
// For every real, distinct basketball/football PDF link discovered, this
// runs the full real pipeline (fetch -> pdf-parse text extraction -> real
// parser -> normalize -> validate) and prints a per-product summary plus the
// normalized rows as JSON, so a human/agent reviewing the workflow log can
// decide - product by product - whether the real data is clean enough to
// persist. Nothing here is committed to the repo automatically.

const fs = require('fs');
const path = require('path');
const { fetchSourceMeta } = require('./fetch-source');
const { ingestToppsPdf } = require('./ingest-topps-pdf');

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'https://www.topps.com';
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Real seed pages on topps.com most likely to real-link out to per-sport
// checklist PDFs - a general checklist index plus the two per-sport category
// pages, all real topps.com paths (not guessed CDN file paths).
const SEEDS = [
  `${BASE}/checklists`,
  `${BASE}/collections/basketball`,
  `${BASE}/collections/football`,
  `${BASE}/pages/basketball`,
  `${BASE}/pages/football`,
];

function absolutize(href) {
  if (!href) return null;
  try {
    return new URL(href, BASE).toString();
  } catch (e) {
    return null;
  }
}

function extractLinks(html) {
  const links = [];
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = absolutize(m[1]);
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (href) links.push({ href, text });
  }
  return links;
}

async function fetchHtml(url) {
  try {
    const { statusCode, headers, body } = await fetchSourceMeta(url, { headers: BROWSER_HEADERS });
    const ct = (headers['content-type'] || '').toLowerCase();
    if (statusCode >= 400) return { ok: false, statusCode, reason: `HTTP ${statusCode}` };
    if (!ct.includes('html')) return { ok: false, statusCode, reason: `non-HTML content-type: ${ct}` };
    return { ok: true, statusCode, html: Buffer.isBuffer(body) ? body.toString('utf8') : String(body) };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function guessProductLabel(url, text) {
  const src = `${text} ${url}`;
  const yearMatch = src.match(/20(2[4-9])/);
  const year = yearMatch ? `20${yearMatch[1]}` : null;
  let product = null;
  if (/cosmic\s*chrome/i.test(src)) product = 'Cosmic Chrome';
  else if (/chrome\s*black/i.test(src)) product = 'Chrome Black';
  else if (/\bfinest\b/i.test(src)) product = 'Finest';
  else if (/\bmidnight\b/i.test(src)) product = 'Midnight';
  else if (/\bresurgence\b/i.test(src)) product = 'Resurgence';
  else if (/signature\s*class/i.test(src)) product = 'Signature Class';
  else if (/\bbowman\b/i.test(src)) product = 'Bowman';
  else if (/\bflagship\b/i.test(src)) product = 'Flagship';
  else if (/\bchrome\b/i.test(src)) product = 'Topps Chrome';
  else if (/\btopps\b/i.test(src)) product = 'Topps';
  return { year, product };
}

(async function main() {
  const allLinks = [];
  const seedResults = [];
  for (const seed of SEEDS) {
    const res = await fetchHtml(seed);
    if (!res.ok) {
      console.log(`[seed] ${seed} -> unreachable/unusable: ${res.reason}`);
      seedResults.push({ seed, ok: false, reason: res.reason });
      continue;
    }
    const links = extractLinks(res.html);
    console.log(`[seed] ${seed} -> HTTP ${res.statusCode}, ${links.length} links extracted`);
    seedResults.push({ seed, ok: true, linkCount: links.length });
    allLinks.push(...links);
    fs.writeFileSync(path.join(OUT_DIR, `discover-bbfb-seed-${seed.replace(/[^a-z0-9]+/gi, '-')}.html`), res.html);
  }

  const pdfLinks = allLinks.filter((l) => /\.pdf(\?|$)/i.test(l.href));
  const basketballLinks = [];
  const footballLinks = [];
  const seenHref = new Set();
  for (const l of pdfLinks) {
    if (seenHref.has(l.href)) continue;
    seenHref.add(l.href);
    if (/basketball|\bnba\b/i.test(`${l.text} ${l.href}`)) basketballLinks.push(l);
    else if (/football|\bnfl\b/i.test(`${l.text} ${l.href}`)) footballLinks.push(l);
  }

  console.log(`\n[discover] ${pdfLinks.length} distinct PDF links total; ${basketballLinks.length} basketball-labeled, ${footballLinks.length} football-labeled`);
  fs.writeFileSync(
    path.join(OUT_DIR, 'discover-bbfb-links.json'),
    JSON.stringify({ seedResults, basketballLinks, footballLinks, allPdfLinkCount: pdfLinks.length }, null, 2)
  );

  const alreadyPersisted = new Set([
    'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/2025-26_Topps_Basketball_Checklist.pdf?v=1759329649',
    'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/NFL2402-2024ToppsChromeFBChecklist.pdf',
  ]);

  async function probeAll(links, sport) {
    const out = [];
    for (const l of links) {
      if (alreadyPersisted.has(l.href)) {
        console.log(`\n[skip] ${sport}: ${l.href} - already a persisted product`);
        continue;
      }
      const { year, product } = guessProductLabel(l.href, l.text);
      const meta = {
        sport,
        year: year || 'unknown',
        manufacturer: 'Topps',
        brand: 'Topps',
        product: product || l.text || 'Topps',
        sourceType: 'manufacturer-checklist-pdf',
        sourceUrl: l.href,
      };
      console.log(`\n[probe] ${sport}: "${l.text}" -> ${l.href} (guessed year=${meta.year} product=${meta.product})`);
      let result;
      try {
        result = await ingestToppsPdf(l.href, meta);
      } catch (err) {
        console.log(`  EXCEPTION: ${err.message}`);
        continue;
      }
      if (!result.networkOk) {
        console.log(`  networkOk=false reason=${result.reason}`);
        continue;
      }
      if (result.format === 'pdf-no-text-layer') {
        console.log(`  format=pdf-no-text-layer (no extractable text, not OCR'd) pages=${result.pageCount}`);
        continue;
      }
      console.log(`  pages=${result.pageCount} rows=${result.rows.length} excluded=${result.excluded.length} status=${result.validation.status}`);
      console.log(`  errors: ${result.validation.errors.join(' | ') || '(none)'}`);
      console.log(`  duplicatePlayerCardCombos: ${result.validation.duplicatePlayerCardCombos.length}`);
      if (result.rows.length) {
        const distinctTeams = new Set(result.rows.map((r) => r.team).filter(Boolean)).size;
        console.log(`  distinctTeams=${distinctTeams}`);
        const key = `${sport}-${(l.text || meta.product).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${meta.year}`;
        console.log(`\n###NORMALIZED-JSON-START:${key}###`);
        console.log(JSON.stringify({ meta, url: l.href, rows: result.rows }));
        console.log(`###NORMALIZED-JSON-END:${key}###`);
      }
      out.push({ url: l.href, text: l.text, meta, rows: result.rows.length, status: result.validation.status });
    }
    return out;
  }

  const basketballProbed = await probeAll(basketballLinks, 'basketball');
  const footballProbed = await probeAll(footballLinks, 'football');

  fs.writeFileSync(
    path.join(OUT_DIR, 'discover-bbfb-summary.json'),
    JSON.stringify({ basketballProbed, footballProbed }, null, 2)
  );
  console.log('\n===== DISCOVER BBFB SUMMARY =====');
  console.log(JSON.stringify({ basketballProbed, footballProbed }, null, 2));
})().catch((err) => {
  console.error('DISCOVER BBFB PRODUCTS FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
