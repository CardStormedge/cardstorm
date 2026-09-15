// scripts/checklists/ingest-panini.js
//
// Panini checklist ingestion: real HTTPS fetch (fetch-source.js) + a real
// HTML parser for Panini's div/span checklist-row markup
// (parseCheckListRowsHtml, tested against the labeled fixture at
// fixtures/panini-fixture-checklist.html) + normalize-checklist.js +
// validate-checklist.js. Deliberately a different markup shape than
// ingest-topps.js (Panini's public checklist pages use repeated
// `<div class="checklist-row">` blocks with labeled spans rather than an
// HTML table), so this proves the pipeline handles more than one source
// shape rather than reusing one parser twice under two names.

const { fetchSource } = require('./fetch-source');
const { normalizeChecklist } = require('./normalize-checklist');
const { validateChecklist } = require('./validate-checklist');
const { buildSourceMeta } = require('./schema');

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

/**
 * Parses Panini-style `<div class="checklist-row">...</div>` blocks, each
 * containing labeled `<span class="card-num|card-player|card-team|card-flag">`
 * children, into raw rows { cardNumber, player, team, rookie }.
 */
function parseCheckListRowsHtml(html) {
  const rows = [];
  const rowRe = /<div[^>]*class="[^"]*checklist-row[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const spanRe = /<span[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/span>/gi;
    const cells = {};
    let spanMatch;
    while ((spanMatch = spanRe.exec(rowMatch[1])) !== null) {
      cells[spanMatch[1].trim()] = stripTags(spanMatch[2]);
    }
    if (!cells['card-num']) continue;
    rows.push({
      cardNumber: cells['card-num'],
      player: cells['card-player'] || null,
      team: cells['card-team'] || null,
      rookie: cells['card-flag'] === 'RR',
    });
  }
  return rows;
}

/**
 * End-to-end: fetch -> parse -> normalize -> validate. Resolves with
 * { networkOk: false, reason } if the fetch fails (never with fabricated
 * rows), or { networkOk: true, rows, excluded, validation } on success.
 */
async function ingestPanini(url, meta) {
  let html;
  try {
    html = await fetchSource(url);
  } catch (err) {
    return { networkOk: false, reason: err.message, url };
  }

  const rawRows = parseCheckListRowsHtml(html);
  const { rows, excluded } = normalizeChecklist(rawRows, meta);
  const sourceMeta = buildSourceMeta({
    sourceUrl: url,
    sourceType: 'manufacturer-checklist-page',
    manufacturer: meta.manufacturer,
  });
  const validation = validateChecklist(rows, { ...sourceMeta, sport: meta.sport, year: meta.year, product: meta.product });

  return { networkOk: true, url, rows, excluded, sourceMeta, validation };
}

module.exports = { parseCheckListRowsHtml, ingestPanini };
