// scripts/checklists/live-pdf-ingestion.js
//
// TEMPORARY diagnostic tool, phase 3 of the PDF-ingestion round: runs the
// real ingestToppsPdf() pipeline (fetch -> pdf-parse text extraction (no
// OCR) -> parseToppsChecklistPdfText -> normalize -> validate) against
// every real official Topps checklist PDF URL in the user-supplied
// handoff manifest (cdn.shopify.com, Topps's own CDN), in the explicit
// sequencing this round was asked to follow: baseball Topps Series 1
// (2024/2025/2026) first; only if that wave comes back clean (reachable,
// real rows parsed, not NOT_READY) does it continue to the rest of
// baseball, then basketball, then football.
//
// For the first-wave baseball Series 1 products, this also prints the
// full normalized rows (minified JSON, delimited) to the job log so they
// can be copied out and written into the repo at data/checklists/... -
// scoped deliberately to the first wave this round (see the PR #30 "LIVE
// TOPPS CDN PDF INGESTION" comment for why: proving the pipeline end to
// end on a few real products first, per the task's own explicit
// instruction not to do all 34 in one blind pass). Every other reachable
// product still gets fully parsed and validated for real - just reported
// as a summary line, not persisted to the repo this round.
//
// Nothing here commits to the repo or fabricates a row. A source that
// fails to parse cleanly is reported NOT_READY with the real reason.

const fs = require('fs');
const path = require('path');
const { ingestToppsPdf } = require('./ingest-topps-pdf');

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CDN = 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/';

// Exactly the real URLs from the user-supplied
// CardStorm_Official_Checklist_Download_Links.txt manifest - copied, not
// retyped. The one DIGITAL/MANUAL entry (2025 Topps Chrome Baseball - no
// direct PDF found) is intentionally excluded; there is nothing to fetch.
const BASEBALL_SERIES1 = [
  { label: '2024 Topps Series 1 Baseball', sport: 'baseball', year: '2024', product: 'Topps Series 1', url: CDN + 'MLB2401-2024ToppsSeries1BBChecklistV1.pdf' },
  { label: '2025 Topps Series 1 Baseball', sport: 'baseball', year: '2025', product: 'Topps Series 1', url: CDN + '2025_Topps_Series_1_BB_Checklist_-_updated.pdf?v=1784567528' },
  { label: '2026 Topps Series 1 Baseball', sport: 'baseball', year: '2026', product: 'Topps Series 1', url: CDN + '2026_Topps_Series_1_Baseball_Checklist_2-23.pdf?v=1772557808' },
];

const BASEBALL_REST = [
  { label: '2024 Topps Series 2 Baseball', sport: 'baseball', year: '2024', product: 'Topps Series 2', url: CDN + 'MLB2402-2024ToppsBBSeries2ChecklistFinal.pdf' },
  { label: '2024 Topps Update Series Baseball', sport: 'baseball', year: '2024', product: 'Topps Update Series', url: CDN + 'MLB2403-CHECKLIST2024ToppsUpdateSeriesBaseball.pdf' },
  { label: '2024 Topps Chrome Baseball', sport: 'baseball', year: '2024', product: 'Topps Chrome', url: CDN + '2426-2024ToppsChromeBaseballChecklist-updated.pdf' },
  { label: '2024 Bowman Baseball', sport: 'baseball', year: '2024', product: 'Bowman', url: CDN + 'MLB2407-2024BowmanBaseballChecklist.pdf' },
  { label: '2024 Bowman Chrome Baseball', sport: 'baseball', year: '2024', product: 'Bowman Chrome', url: CDN + 'MLB2408-2024BowmanChromeChecklistV2.pdf' },
  { label: '2025 Topps Series 2 Baseball', sport: 'baseball', year: '2025', product: 'Topps Series 2', url: CDN + '2025ToppsSeries2BaseballChecklist6-3.pdf?v=1749040089' },
  { label: '2025 Topps Update Series Baseball', sport: 'baseball', year: '2025', product: 'Topps Update Series', url: CDN + '2025_Topps_Update_Series_BB_Checklist_Final_V3.pdf?v=1762291180' },
  { label: '2025 Bowman Baseball', sport: 'baseball', year: '2025', product: 'Bowman', url: CDN + 'MLB2507-2025BowmanBaseballChecklist2.pdf?v=1746543006' },
  { label: '2025 Bowman Chrome Baseball', sport: 'baseball', year: '2025', product: 'Bowman Chrome', url: CDN + '2025_Bowman_Chrome_Baseball_Checklist.pdf?v=1755030361' },
  { label: '2026 Topps Series 2 Baseball', sport: 'baseball', year: '2026', product: 'Topps Series 2', url: CDN + '2026_Topps_Series_2_Baseball_Checklist_5-11.pdf?v=1778521905' },
  { label: '2026 Topps Update Series Baseball', sport: 'baseball', year: '2026', product: 'Topps Update Series', url: CDN + '2026_Topps_Update_Series_Baseball_Checklist_9-4.pdf?v=1789146002' },
  { label: '2026 Topps Chrome Baseball', sport: 'baseball', year: '2026', product: 'Topps Chrome', url: CDN + '2026_Topps_Chrome_Baseball_Checklist_Final_7.22.pdf?v=1785169183' },
  { label: '2026 Bowman Baseball', sport: 'baseball', year: '2026', product: 'Bowman', url: CDN + '2026_Bowman_Baseball_Checklist.pdf?v=1775743176' },
  { label: '2026 Bowman Chrome Baseball', sport: 'baseball', year: '2026', product: 'Bowman Chrome', url: CDN + '2026_Bowman_Chrome_Baseball_Checklist_1.pdf?v=1786458901' },
];

const BASKETBALL = [
  { label: '2024-25 Topps Chrome Basketball', sport: 'basketball', year: '2024', product: 'Topps Chrome', url: CDN + 'NBA2502Checklistfinal.pdf?v=1746817269' },
  { label: '2025-26 Topps Basketball', sport: 'basketball', year: '2025', product: 'Topps Basketball', url: CDN + '2025-26_Topps_Basketball_Checklist.pdf?v=1759329649' },
  { label: '2025-26 Topps Chrome Basketball', sport: 'basketball', year: '2025', product: 'Topps Chrome', url: CDN + '2025-26_Topps_Chrome_Basketball_Checklist.pdf?v=1763392799' },
  { label: '2025-26 Topps Cosmic Chrome Basketball', sport: 'basketball', year: '2025', product: 'Topps Cosmic Chrome', url: CDN + '2025-26_Topps_Cosmic_Chrome_Basketball_Checklist.pdf?v=1774549583' },
  { label: '2025-26 Topps Finest Basketball', sport: 'basketball', year: '2025', product: 'Topps Finest', url: CDN + '2025-2026_Topps_Finest_Basketball_Checklist.pdf?v=1771360733' },
  { label: '2026 Topps Chrome Black Basketball', sport: 'basketball', year: '2026', product: 'Topps Chrome Black', url: CDN + 'Cheklist_chrome_black.pdf?v=1785244468' },
];

const FOOTBALL = [
  { label: '2024 Topps Chrome Football', sport: 'football', year: '2024', product: 'Topps Chrome', url: CDN + 'NFL2402-2024ToppsChromeFBChecklist.pdf' },
  { label: '2024 Topps Finest Football', sport: 'football', year: '2024', product: 'Topps Finest', url: CDN + 'NFL2403-CheckList_24FFBL_VERSION5.pdf?v=1741700513' },
  { label: '2024 Topps Midnight Football', sport: 'football', year: '2024', product: 'Topps Midnight', url: CDN + 'NFL2406-2024ToppsMidnightFootball_V1_Checklist.pdf?v=1745854407' },
  { label: '2024 Topps Resurgence Football', sport: 'football', year: '2024', product: 'Topps Resurgence', url: CDN + 'NFL2409-CheckList_24TRFB_VERSION1.pdf?v=1744121930' },
  { label: '2024 Topps Signature Class Football', sport: 'football', year: '2024', product: 'Topps Signature Class', url: CDN + 'NFL2418-CheckList_24CSFB_VERSION1.pdf?v=1745349306' },
  { label: '2025 Topps Chrome Football', sport: 'football', year: '2025', product: 'Topps Chrome', url: CDN + '2025_Chrome_Football_Checklist_040826.pdf?v=1775678965' },
  { label: '2025 Topps Finest Football', sport: 'football', year: '2025', product: 'Topps Finest', url: CDN + '2025_Topps_Finest_Checklist_042326.pdf?v=1776986521' },
  { label: '2025 Topps Cosmic Chrome Football', sport: 'football', year: '2025', product: 'Topps Cosmic Chrome', url: CDN + '2025_Topps_Cosmic_Chrome_Checklist_051826.pdf?v=1779115984' },
  { label: '2025 Topps Chrome Black Football', sport: 'football', year: '2025', product: 'Topps Chrome Black', url: CDN + 'CheckList_25TFBK_VERSION1_1.pdf?v=1753211805' },
  { label: '2026 Bowman Football', sport: 'football', year: '2026', product: 'Bowman', url: CDN + '2026_Bowman_Football_Checklist.pdf?v=1788198834' },
  { label: '2026 Topps Flagship Football', sport: 'football', year: '2026', product: 'Topps Flagship', url: CDN + 'CheckList_26TFOB_VERSION5_1.pdf?v=1786730315' },
];

function slug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function ingestOne(target) {
  const meta = { sport: target.sport, year: target.year, manufacturer: 'Topps', brand: 'Topps', product: target.product, sourceType: 'manufacturer-checklist-pdf', sourceUrl: target.url };
  const result = await ingestToppsPdf(target.url, meta);
  const summary = {
    label: target.label,
    sport: target.sport,
    year: target.year,
    product: target.product,
    url: target.url,
    networkOk: result.networkOk,
    format: result.format || null,
    pageCount: result.pageCount || null,
    rowsParsed: result.rows ? result.rows.length : 0,
    excludedCount: result.excluded ? result.excluded.length : 0,
    validationStatus: result.validation ? result.validation.status : 'NOT_READY',
    errors: result.validation ? result.validation.errors : [result.reason].filter(Boolean),
    warnings: result.validation ? result.validation.warnings.slice(0, 5) : [],
    duplicateCardNumbers: result.validation ? result.validation.duplicateCardNumbers.slice(0, 10) : [],
  };
  console.log(`\n[${summary.validationStatus}] ${target.label}`);
  console.log(`  url: ${target.url}`);
  console.log(`  networkOk=${result.networkOk} format=${summary.format} pages=${summary.pageCount} rows=${summary.rowsParsed} excluded=${summary.excludedCount}`);
  if (summary.errors.length) console.log(`  errors: ${summary.errors.join(' | ')}`);
  if (summary.duplicateCardNumbers.length) console.log(`  duplicate card numbers (first 10): ${summary.duplicateCardNumbers.join(', ')}`);

  if (target.sport === 'baseball' && result.rows) {
    const judgeRow = result.rows.find((r) => /aaron judge/i.test(r.player || '') && /yankees/i.test(r.team || ''));
    if (judgeRow) {
      console.log(`  AARON JUDGE FOUND: card #${judgeRow.cardNumber}, team "${judgeRow.team}"`);
      summary.aaronJudgeCardNumber = judgeRow.cardNumber;
    } else {
      console.log('  Aaron Judge: not found in this product\'s real parsed rows.');
    }
  }

  return { summary, rows: result.rows || null };
}

(async function main() {
  const allSummaries = [];
  const firstWaveOutput = {};

  console.log('\n========== WAVE A: Baseball Topps Series 1 (2024/2025/2026) - first-wave proof ==========');
  const waveAResults = [];
  for (const target of BASEBALL_SERIES1) {
    const r = await ingestOne(target);
    waveAResults.push(r);
    allSummaries.push(r.summary);
    firstWaveOutput[slug(target.label)] = r;
  }

  const waveAClean = waveAResults.every((r) => r.summary.networkOk && r.summary.rowsParsed > 0 && r.summary.validationStatus !== 'NOT_READY');
  console.log(`\n[gate] Wave A clean (reachable, real rows parsed, not NOT_READY for all 3): ${waveAClean}`);

  if (waveAClean) {
    console.log('\n========== WAVE B: rest of baseball (Series 2 / Update / Chrome / Bowman / Bowman Chrome, 2024-2026) ==========');
    for (const target of BASEBALL_REST) {
      const r = await ingestOne(target);
      allSummaries.push(r.summary);
    }

    console.log('\n========== WAVE C: basketball ==========');
    for (const target of BASKETBALL) {
      const r = await ingestOne(target);
      allSummaries.push(r.summary);
    }

    console.log('\n========== WAVE D: football ==========');
    for (const target of FOOTBALL) {
      const r = await ingestOne(target);
      allSummaries.push(r.summary);
    }
  } else {
    console.log('\n[gate] Skipping Wave B/C/D (rest of baseball, basketball, football) because Wave A was not fully clean.');
  }

  fs.writeFileSync(path.join(OUT_DIR, 'pdf-ingestion-summary.json'), JSON.stringify(allSummaries, null, 2));

  console.log('\n\n===== FULL SUMMARY TABLE =====');
  for (const s of allSummaries) {
    console.log(`${s.validationStatus.padEnd(10)} | rows=${String(s.rowsParsed).padStart(4)} | ${s.label}`);
  }

  console.log('\n\n===== FIRST-WAVE NORMALIZED ROWS (for repo write-up - Wave A only, minified JSON) =====');
  for (const [key, r] of Object.entries(firstWaveOutput)) {
    if (r.summary.rowsParsed > 0) {
      console.log(`\n###NORMALIZED-JSON-START:${key}###`);
      console.log(JSON.stringify(r.rows));
      console.log(`###NORMALIZED-JSON-END:${key}###`);
    }
  }
})().catch((err) => {
  console.error('LIVE PDF INGESTION FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
