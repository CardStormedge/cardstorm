// scripts/checklists/ingest-topps.js
//
// Topps checklist ingestion: real HTTPS fetch (fetch-source.js) + a real
// HTML-table parser (parseToppsChecklistHtml, tested against the labeled
// fixture at fixtures/topps-fixture-checklist.html) + normalize-checklist.js
// + validate-checklist.js. `ingestTopps` is the end-to-end entry point a
// future session with real network access can call directly; nothing here
// simulates a response.
//
// Expected page shape this parser targets: an HTML <table> whose rows carry
// a card number cell, a player-name cell, a team cell, and an optional
// rookie-marker cell (the "RC" abbreviation Topps checklist pages use). If
// a real topps.com page's markup differs, `parseToppsChecklistHtml` is the
// single function to adapt - it never falls back to guessing rows out of
// unstructured text.

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
 * Parses a Topps-style checklist HTML table into raw rows
 * { cardNumber, player, team, rookie }. Returns an empty array (not an
 * error) if the page has no rows in the expected structure - callers treat
 * zero rows as a validation failure (see validate-checklist.js), not a
 * crash.
 */
function parseToppsChecklistHtml(html) {
  const rows = [];
  const tableMatch = html.match(/<table[^>]*class="[^"]*checklist-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(tableMatch[1])) !== null) {
    const tdRe = /<td[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = {};
    let tdMatch;
    while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
      cells[tdMatch[1].trim()] = stripTags(tdMatch[2]);
    }
    if (!cells.num) continue; // header row or malformed row - skip, don't guess
    rows.push({
      cardNumber: cells.num,
      player: cells.player || null,
      team: cells.team || null,
      rookie: cells.rc === 'RC',
    });
  }
  return rows;
}

/**
 * End-to-end: fetch -> parse -> normalize -> validate. Resolves with
 * { networkOk: false, reason } if the fetch fails (never with fabricated
 * rows), or { networkOk: true, rows, excluded, validation } on success.
 */
async function ingestTopps(url, meta) {
  let html;
  try {
    html = await fetchSource(url);
  } catch (err) {
    return { networkOk: false, reason: err.message, url };
  }

  const rawRows = parseToppsChecklistHtml(html);
  const { rows, excluded } = normalizeChecklist(rawRows, meta);
  const sourceMeta = buildSourceMeta({
    sourceUrl: url,
    sourceType: 'manufacturer-checklist-page',
    manufacturer: meta.manufacturer,
  });
  const validation = validateChecklist(rows, { ...sourceMeta, sport: meta.sport, year: meta.year, product: meta.product });

  return { networkOk: true, url, rows, excluded, sourceMeta, validation };
}

module.exports = { parseToppsChecklistHtml, ingestTopps };
