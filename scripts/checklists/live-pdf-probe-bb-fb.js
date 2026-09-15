// scripts/checklists/live-pdf-probe-bb-fb.js
//
// TEMPORARY diagnostic tool: fetches ONE real basketball checklist PDF
// (2025-26 Topps Basketball) and ONE real football checklist PDF (2024
// Topps Chrome Football) from the real official manifest and dumps their
// extracted text, so the basketball/football team-name lists and parser
// assumptions (both currently unvalidated - written from general
// knowledge, never checked against real fetched text) can be fixed
// against what these real PDFs actually contain, instead of guessed.
// Mirrors live-pdf-probe.js's approach for baseball in an earlier round.

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { fetchSourceMeta } = require('./fetch-source');

const CDN = 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/';
const PROBE_URLS = [
  { label: '2025-26 Topps Basketball', url: CDN + '2025-26_Topps_Basketball_Checklist.pdf?v=1759329649' },
  { label: '2024 Topps Chrome Football', url: CDN + 'NFL2402-2024ToppsChromeFBChecklist.pdf' },
];

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function probeOne({ label, url }) {
  console.log(`\n========== ${label} ==========`);
  console.log(`URL: ${url}`);
  let meta;
  try {
    meta = await fetchSourceMeta(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
  } catch (err) {
    console.log(`UNREACHABLE: ${err.message}`);
    return;
  }
  console.log(`HTTP ${meta.statusCode}, content-type: ${meta.headers['content-type']}`);
  if (meta.statusCode >= 400) return;

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
    console.log('--- First 70 lines ---');
    console.log(lines.slice(0, 70).map((l, i) => `${i}: ${JSON.stringify(l)}`).join('\n'));
    const mid = Math.floor(lines.length / 2);
    console.log('--- Middle 30 lines ---');
    console.log(lines.slice(mid, mid + 30).map((l, i) => `${mid + i}: ${JSON.stringify(l)}`).join('\n'));
    console.log('--- Last 30 non-empty lines ---');
    const nonEmpty = lines.filter((l) => l.trim());
    console.log(nonEmpty.slice(-30).map((l, i) => `${i}: ${JSON.stringify(l)}`).join('\n'));
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
