// scripts/checklists/live-pdf-persist-bbfb.js
//
// Lean, focused companion to live-pdf-ingestion.js: fetches + parses +
// validates ONLY the 2 basketball/football products the fixed parser
// (see ingest-topps-pdf.js's real basketball/football fix) should now be
// able to handle, and prints their full normalized rows for a repo
// write-up. Kept deliberately small (2 sources, no raw-text dump) so its
// job log stays small and reliably fetchable - the full 34-source run
// (live-pdf-ingestion.js) plus the raw-text probe (live-pdf-probe-bb-fb.js)
// together produce a very large combined log.

const fs = require('fs');
const path = require('path');
const { ingestToppsPdf } = require('./ingest-topps-pdf');

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CDN = 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/';
const TARGETS = [
  { label: '2025-26 Topps Basketball', sport: 'basketball', year: '2025', product: 'Topps Basketball', url: CDN + '2025-26_Topps_Basketball_Checklist.pdf?v=1759329649' },
  { label: '2024 Topps Chrome Football', sport: 'football', year: '2024', product: 'Topps Chrome', url: CDN + 'NFL2402-2024ToppsChromeFBChecklist.pdf' },
];

(async function main() {
  for (const target of TARGETS) {
    const meta = { sport: target.sport, year: target.year, manufacturer: 'Topps', brand: 'Topps', product: target.product, sourceType: 'manufacturer-checklist-pdf', sourceUrl: target.url };
    const result = await ingestToppsPdf(target.url, meta);
    console.log(`\n[${result.validation ? result.validation.status : 'NOT_READY'}] ${target.label}`);
    console.log(`  url: ${target.url}`);
    console.log(`  networkOk=${result.networkOk} format=${result.format} pages=${result.pageCount} rows=${result.rows ? result.rows.length : 0} excluded=${result.excluded ? result.excluded.length : 0}`);
    if (result.validation) {
      console.log(`  errors: ${result.validation.errors.join(' | ') || '(none)'}`);
      console.log(`  duplicatePlayerCardCombos: ${result.validation.duplicatePlayerCardCombos.length}`);
      console.log(`  duplicateCardNumbers (informational): ${result.validation.duplicateCardNumbers.length}`);
    } else if (result.reason) {
      console.log(`  reason: ${result.reason}`);
    }
    if (result.rows && result.rows.length) {
      const distinctTeams = new Set(result.rows.map((r) => r.team).filter(Boolean)).size;
      const distinctPlayers = new Set(result.rows.map((r) => r.player).filter(Boolean)).size;
      console.log(`  distinctTeams=${distinctTeams} distinctPlayers=${distinctPlayers}`);
      const key = target.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      console.log(`\n###NORMALIZED-JSON-START:${key}###`);
      console.log(JSON.stringify(result.rows));
      console.log(`###NORMALIZED-JSON-END:${key}###`);
    }
  }
})().catch((err) => {
  console.error('LIVE PDF PERSIST (basketball/football) FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
