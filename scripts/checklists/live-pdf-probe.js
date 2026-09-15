// scripts/checklists/live-pdf-probe.js
//
// TEMPORARY diagnostic tool, phase 1 of the PDF-ingestion round: fetches a
// handful of real official Topps checklist PDFs (from cdn.shopify.com,
// Topps's own CDN - a different host than www.topps.com, which prior
// rounds proved is blocked by Cloudflare Bot Management) and dumps their
// extracted text so a real parser can be built against the REAL structure
// instead of guessed. Prints raw text (first N lines, plus a middle
// sample) to the job log - nothing here writes to the repo or decides
// pass/fail; scripts/checklists/ingest-topps-pdf.js (built after this
// probe's real output is inspected) does that.

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { fetchSourceMeta } = require('./fetch-source');

const PROBE_URLS = [
  { label: '2024 Topps Series 1 Baseball', url: 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/MLB2401-2024ToppsSeries1BBChecklistV1.pdf' },
  { label: '2025 Topps Series 1 Baseball', url: 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/2025_Topps_Series_1_BB_Checklist_-_updated.pdf?v=1784567528' },
  { label: '2026 Topps Series 1 Baseball', url: 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/2026_Topps_Series_1_Baseball_Checklist_2-23.pdf?v=1772557808' },
];

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function probeOne({ label, url }) {
  console.log(`\n========== ${label} ==========`);
  console.log(`URL: ${url}`);
  let meta;
  try {
    meta = await fetchSourceMeta(url);
  } catch (err) {
    console.log(`UNREACHABLE: ${err.message}`);
    return;
  }
  console.log(`HTTP ${meta.statusCode}, content-type: ${meta.headers['content-type']}, content-length: ${meta.headers['content-length'] || meta.body.length}`);
  if (meta.statusCode >= 400) {
    console.log('Non-2xx response, not attempting PDF parse.');
    return;
  }
  const outPdfPath = path.join(OUT_DIR, `probe-${label.replace(/\W+/g, '-')}.pdf`);
  fs.writeFileSync(outPdfPath, meta.body);
  console.log(`Saved raw PDF bytes to ${outPdfPath} (${meta.body.length} bytes) - workflow-local only, not committed.`);

  let parser;
  try {
    parser = new PDFParse({ data: meta.body });
    const info = await parser.getInfo();
    console.log(`PDF pages: ${info.total}`);
    const textResult = await parser.getText();
    const fullText = textResult.text || '';
    fs.writeFileSync(path.join(OUT_DIR, `probe-${label.replace(/\W+/g, '-')}.txt`), fullText);
    const lines = fullText.split(/\r?\n/);
    console.log(`Extracted text: ${fullText.length} chars, ${lines.length} lines.`);
    console.log('--- First 60 lines ---');
    console.log(lines.slice(0, 60).map((l, i) => `${i}: ${JSON.stringify(l)}`).join('\n'));
    const mid = Math.floor(lines.length / 2);
    console.log('--- Middle 30 lines ---');
    console.log(lines.slice(mid, mid + 30).map((l, i) => `${mid + i}: ${JSON.stringify(l)}`).join('\n'));

    try {
      const tableResult = await parser.getTable();
      const t0 = tableResult.pages && tableResult.pages[0] && tableResult.pages[0].tables && tableResult.pages[0].tables[0];
      console.log(`--- getTable() page 0 table 0: ${t0 ? t0.length + ' rows' : 'none detected'} ---`);
      if (t0) console.log(JSON.stringify(t0.slice(0, 10), null, 2));
    } catch (tableErr) {
      console.log(`getTable() failed/unavailable: ${tableErr.message}`);
    }
  } catch (err) {
    console.log(`PDF PARSE FAILED: ${err.message}`);
  } finally {
    if (parser) await parser.destroy();
  }
}

(async function main() {
  for (const target of PROBE_URLS) {
    await probeOne(target);
  }
})().catch((err) => {
  console.error('PROBE FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
