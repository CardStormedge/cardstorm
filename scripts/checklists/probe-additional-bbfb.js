// scripts/checklists/probe-additional-bbfb.js
//
// TEMPORARY diagnostic tool, run only from
// .github/workflows/pr30-topps-live-ingestion-test.yml on a GitHub-hosted
// runner (real network access; this sandbox's own egress is blocked to
// topps.com/cdn.shopify.com).
//
// www.topps.com itself now returns a flat HTTP 403 to EVERY path (including
// "/" itself) from the GitHub-hosted runner too - confirmed in run
// 35030775318, where even the bare "/" seed fetch came back 403 with
// Cloudflare bot-protection headers (server: cloudflare, __cf_bm cookie).
// This means discover-bbfb-products.js's approach (crawl topps.com's own
// real pages for real links) can no longer work - not because the pipeline
// is broken, but because topps.com's own front door is now blocked outright,
// even for a real browser-like request from a real server.
//
// Since cdn.shopify.com (Topps's actual checklist-PDF host) remains
// reachable directly (confirmed: 200 OK on already-known files in this same
// run), the URLs below were found via a real, external, already-existing
// index of that CDN path (a web search of the exact same cdn.shopify.com
// store path - 0662/9749/5709/files/ - that every already-persisted product
// in this repo uses) rather than guessed from a filename pattern. Every URL
// is fetched for real here and EXCLUDED from persistence unless it comes
// back genuinely clean - nothing below is assumed to work just because it
// was found.
//
// Phase A (this script): summary-only probe of several real candidate
// basketball/football checklist PDFs, to decide - based on real validation
// output - which (if any) are clean enough to persist, without dumping full
// normalized-row JSON for all of them (keeps the log small).

const fs = require('fs');
const path = require('path');
const { ingestToppsPdf } = require('./ingest-topps-pdf');

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CDN = 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/';

const CANDIDATES = [
  { sport: 'basketball', year: '2025', product: 'Topps Holiday Basketball', url: CDN + '2025-26_Topps_Holiday_Basketball_Checklist.pdf?v=1758833954' },
  { sport: 'basketball', year: '2025', product: 'Topps Midnight Basketball', url: CDN + '2025-2026_Topps_Midnight_Basketball_Checklist.pdf?v=1767709196' },
  { sport: 'basketball', year: '2025', product: 'Topps Chrome Basketball', url: CDN + '2025-26_Topps_Chrome_Basketball_Checklist.pdf?v=1763392799' },
  { sport: 'basketball', year: '2025', product: 'Topps Finest Basketball', url: CDN + '2025-2026_Topps_Finest_Basketball_Checklist.pdf?v=1771360733' },
  { sport: 'basketball', year: '2024', product: 'Topps Inception Basketball', url: CDN + '2024-25_Topps_Inception_Basketball_Checklist.pdf?v=1755011938' },
  { sport: 'football', year: '2026', product: 'Topps Football', url: CDN + 'CheckList_26TFOB_VERSION5_1.pdf?v=1786730315' },
  { sport: 'football', year: '2025', product: 'Topps Cosmic Chrome Football', url: CDN + '2025_Topps_Cosmic_Chrome_Checklist_051826.pdf?v=1779115984' },
  { sport: 'football', year: '2026', product: 'Bowman Football', url: CDN + '2026_Bowman_Football_Checklist.pdf?v=1788198834' },
];

(async function main() {
  const summaries = [];
  for (const c of CANDIDATES) {
    const meta = { sport: c.sport, year: c.year, manufacturer: 'Topps', brand: 'Topps', product: c.product, sourceType: 'manufacturer-checklist-pdf', sourceUrl: c.url };
    let result;
    try {
      result = await ingestToppsPdf(c.url, meta);
    } catch (err) {
      console.log(`\n[EXCEPTION] ${c.sport} ${c.year} ${c.product}: ${err.message}`);
      summaries.push({ ...c, error: err.message });
      continue;
    }
    if (!result.networkOk) {
      console.log(`\n[NETWORK FAIL] ${c.sport} ${c.year} ${c.product}: ${result.reason}`);
      summaries.push({ ...c, networkOk: false, reason: result.reason });
      continue;
    }
    if (result.format === 'pdf-no-text-layer') {
      console.log(`\n[NO TEXT LAYER] ${c.sport} ${c.year} ${c.product}: pages=${result.pageCount}`);
      summaries.push({ ...c, format: 'pdf-no-text-layer', pages: result.pageCount });
      continue;
    }
    const distinctTeams = new Set(result.rows.map((r) => r.team).filter(Boolean)).size;
    console.log(`\n[${result.validation.status}] ${c.sport} ${c.year} ${c.product}`);
    console.log(`  url: ${c.url}`);
    console.log(`  pages=${result.pageCount} rows=${result.rows.length} excluded=${result.excluded.length} distinctTeams=${distinctTeams}`);
    console.log(`  errors: ${result.validation.errors.join(' | ') || '(none)'}`);
    console.log(`  duplicatePlayerCardCombos: ${result.validation.duplicatePlayerCardCombos.length}`);
    console.log(`  malformedNames: ${result.validation.malformedNames.length}`);
    if (result.rows.length) console.log(`  sample row: ${JSON.stringify(result.rows[0])}`);
    summaries.push({
      ...c,
      networkOk: true,
      pages: result.pageCount,
      rows: result.rows.length,
      excluded: result.excluded.length,
      distinctTeams,
      status: result.validation.status,
      errors: result.validation.errors,
      duplicatePlayerCardCombos: result.validation.duplicatePlayerCardCombos.length,
      malformedNames: result.validation.malformedNames.length,
    });
  }
  fs.writeFileSync(path.join(OUT_DIR, 'probe-additional-bbfb-summary.json'), JSON.stringify(summaries, null, 2));
  console.log('\n===== PROBE ADDITIONAL BBFB SUMMARY =====');
  console.log(JSON.stringify(summaries, null, 2));
})().catch((err) => {
  console.error('PROBE ADDITIONAL BBFB FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
