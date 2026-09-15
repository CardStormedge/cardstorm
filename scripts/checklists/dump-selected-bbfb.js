// scripts/checklists/dump-selected-bbfb.js
//
// TEMPORARY diagnostic tool, run only from
// .github/workflows/pr30-topps-live-ingestion-test.yml on a GitHub-hosted
// runner (real network access). Phase B: for the specific candidates that
// probe-additional-bbfb.js already showed real, clean (RELEASED,
// zero duplicatePlayerCardCombos, zero malformedNames) validation output
// for, re-fetch and dump the FULL normalized rows as JSON so they can be
// captured from the job log and persisted as real repo data files. Only the
// candidates that already proved clean in the summary-only probe are
// included here - scripts/checklists/probe-additional-bbfb.js's real output
// is what decided this list, nothing was assumed.
//
// Excluded on purpose, with real reasons (not forced):
//   - 2024-25 Topps Inception Basketball: probe-additional-bbfb.js's real
//     run returned 0 rows / NOT_READY - this product's real PDF text layer
//     does not match the confirmed basketball parsing strategy, and
//     forcing it would mean guessing a new structure without direct
//     inspection of its real raw text, which this round's budget does not
//     allow. Left unpersisted.
//   - 2026 Bowman Football: probe-additional-bbfb.js's real output showed
//     155 distinct "team" values (vs. a real ~32-city NFL market) - Bowman
//     is a prospect-focused product whose real checklist rows include
//     college team names for not-yet-drafted rookies, a genuinely
//     different data shape than the confirmed city-only NFL team
//     structure the existing football team-mapping (nfl-city-team-map.js)
//     was built for. Persisting it without dedicated review of that
//     college-vs-NFL distinction risks silently mislabeling real college
//     affiliations as NFL teams - left unpersisted this round rather than
//     guessed at.

const fs = require('fs');
const path = require('path');
const { ingestToppsPdf } = require('./ingest-topps-pdf');

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CDN = 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/';

const TARGETS = [
  { key: 'bball-holiday-2025', sport: 'basketball', year: '2025', product: 'Topps Holiday Basketball', url: CDN + '2025-26_Topps_Holiday_Basketball_Checklist.pdf?v=1758833954' },
  { key: 'bball-midnight-2025', sport: 'basketball', year: '2025', product: 'Topps Midnight Basketball', url: CDN + '2025-2026_Topps_Midnight_Basketball_Checklist.pdf?v=1767709196' },
  { key: 'bball-chrome-2025', sport: 'basketball', year: '2025', product: 'Topps Chrome Basketball', url: CDN + '2025-26_Topps_Chrome_Basketball_Checklist.pdf?v=1763392799' },
  { key: 'bball-finest-2025', sport: 'basketball', year: '2025', product: 'Topps Finest Basketball', url: CDN + '2025-2026_Topps_Finest_Basketball_Checklist.pdf?v=1771360733' },
  { key: 'fb-topps-2026', sport: 'football', year: '2026', product: 'Topps Football', url: CDN + 'CheckList_26TFOB_VERSION5_1.pdf?v=1786730315' },
  { key: 'fb-cosmicchrome-2025', sport: 'football', year: '2025', product: 'Topps Cosmic Chrome Football', url: CDN + '2025_Topps_Cosmic_Chrome_Checklist_051826.pdf?v=1779115984' },
];

(async function main() {
  for (const t of TARGETS) {
    const meta = { sport: t.sport, year: t.year, manufacturer: 'Topps', brand: 'Topps', product: t.product, sourceType: 'manufacturer-checklist-pdf', sourceUrl: t.url };
    const result = await ingestToppsPdf(t.url, meta);
    if (!result.networkOk || !result.rows) {
      console.log(`\n[FAIL] ${t.key}: networkOk=${result.networkOk} reason=${result.reason || result.format}`);
      continue;
    }
    console.log(`\n[${result.validation.status}] ${t.key}: rows=${result.rows.length}`);
    console.log(`###ROWS-START:${t.key}###`);
    console.log(JSON.stringify(result.rows));
    console.log(`###ROWS-END:${t.key}###`);
  }
})().catch((err) => {
  console.error('DUMP SELECTED BBFB FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
