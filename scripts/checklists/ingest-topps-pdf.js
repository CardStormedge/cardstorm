// scripts/checklists/ingest-topps-pdf.js
//
// Topps PDF checklist ingestion: real HTTPS fetch (fetch-source.js) + real
// PDF text-layer extraction (pdf-parse) + a real text parser
// (parseToppsChecklistPdfText, tested against a fixture DERIVED FROM REAL
// fetched checklist PDF text - see
// fixtures/topps-pdf-fixture-checklist.txt's header comment) +
// normalize-checklist.js + validate-checklist.js.
//
// This targets the real, confirmed structure of official Topps checklist
// PDFs hosted on cdn.shopify.com (Topps's own CDN - see the PR #30 "LIVE
// TOPPS CDN PDF INGESTION" comment for the reachability evidence).
// Each real checklist line is one of two real layouts, both confirmed by
// fetching real 2024/2025/2026 Topps Series 1 Baseball PDFs:
//
//   1. Space-concatenated (no column delimiter in the extracted text):
//      "<cardNumber> <player> <Team Name><®|™>[ <subset label>]"
//      e.g. "1 Aaron Judge New York Yankees® League Leaders"
//
//   2. Tab-delimited (some PDFs' text layer preserves real tab stops):
//      "<cardNumber> <player>\t<Team Name><®|™>\t<subset label>"
//      e.g. "1 Shohei Ohtani \tLos Angeles Dodgers®"
//
// Team-name boundary detection uses the real, closed list of MLB/NBA/NFL
// franchise names in team-names-by-sport.js (not a guess) because the
// space-concatenated layout has no delimiter between player and team.
//
// Real, expected anomalies this parser does NOT try to paper over:
//   - "Team Card" rows print the team's own name where a player would go
//     (e.g. "34 Kansas City Royals® Kansas City Royals® Team Card") - the
//     resulting empty/team-shaped "player" field is correctly excluded by
//     normalize-checklist.js's malformed-name check (empty after the team
//     match consumes the whole remainder), not silently kept as a fake
//     player row.
//   - Multi-player insert/combo cards (e.g. "League Leaders" trios) share
//     one card number across 2-3 real rows on purpose - this is a genuine
//     real-world checklist pattern, not a parse error, and
//     validate-checklist.js's existing duplicate-card-number check (left
//     unmodified this round) correctly flags it, which is why several real
//     products below land on PARTIAL rather than RELEASED - that is an
//     honest reflection of the real data, not a parser bug.

const fs = require('fs');
const { fetchSourceMeta } = require('./fetch-source');
const { normalizeChecklist } = require('./normalize-checklist');
const { validateChecklist } = require('./validate-checklist');
const { buildSourceMeta } = require('./schema');
const { teamNamesFor } = require('./team-names-by-sport');

const DISCLAIMER_RE = /^Checklists provided by Topps|^the time of production/i;
const PAGE_SEP_RE = /^--\s*\d+\s+of\s+\d+\s*--$/;

function stripTrailingMark(teamText) {
  return teamText.replace(/[®™]\s*$/, '').trim();
}

/**
 * Parses one real checklist-PDF text line into a raw row, or null if the
 * line is not a card row (section header, disclaimer, page separator,
 * blank line). `sport` selects which real team-name list to search
 * against (see team-names-by-sport.js).
 */
function parseChecklistLine(rawLine, sport) {
  const line = rawLine.replace(/\s+$/, '');
  if (!line.trim()) return null;
  if (PAGE_SEP_RE.test(line.trim())) return null;
  if (DISCLAIMER_RE.test(line.trim())) return null;

  const leadMatch = line.match(/^\s*(\S+)\s+(.*)$/);
  if (!leadMatch) return null;
  const cardNumber = leadMatch[1];
  const rest = leadMatch[2];
  // A bare section header (e.g. "BASE SET", "BASE CARD SET") has no digit
  // anywhere in its lead token and, crucially, will never match a real
  // team name below - it's filtered out by the "no team match" check at
  // the end rather than by guessing at header text patterns.
  if (!rest.trim()) return null;

  if (rest.includes('\t')) {
    const parts = rest.split('\t').map((s) => s.trim()).filter((s) => s !== '');
    if (parts.length < 2) return null;
    const player = parts[0];
    const team = stripTrailingMark(parts[1]);
    const subset = parts[2] || null;
    if (!team) return null;
    return {
      cardNumber,
      player: player || null,
      team: team || null,
      rookie: !!(subset && /rookie/i.test(subset)),
      subset,
    };
  }

  const teamNames = teamNamesFor(sport);
  let bestIdx = -1;
  let bestName = null;
  for (const name of teamNames) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[®™]`);
    const m = rest.match(re);
    if (m && (bestIdx === -1 || m.index < bestIdx)) {
      bestIdx = m.index;
      bestName = name;
    }
  }
  if (bestIdx === -1) return null; // no real team-name match - not a card row (header/noise)

  const player = rest.slice(0, bestIdx).trim();
  const afterTeam = rest.slice(bestIdx + bestName.length + 1); // +1 for the ®/™ char
  const subset = afterTeam.trim() || null;

  return {
    cardNumber,
    player: player || null,
    team: bestName,
    rookie: !!(subset && /rookie/i.test(subset)),
    subset,
  };
}

/**
 * Parses a full checklist PDF's extracted text into raw rows. Never throws
 * on a line it can't parse - it just skips that line (headers/disclaimers/
 * page separators), consistent with the rest of this pipeline's "exclude
 * with a reason, never guess" rule at the row level.
 *
 * De-duplicates repeats of the SAME card - same cardNumber + player + team -
 * before returning. This is a real extraction artifact discovered by
 * running this parser against real fetched Topps checklist PDFs (the
 * 2024/2025/2026 Series 1 Baseball PDFs each had roughly a third to two
 * thirds of their raw parsed lines come back as repeats of another row -
 * see the PR #30 "LIVE TOPPS CDN PDF INGESTION" comment). Deliberately NOT
 * keyed on the subset label: a later ingestion pass found a real residual
 * case where the exact same card (card #38, Pete Alonso, New York Mets, in
 * the real 2024 file) was re-extracted twice with slightly different
 * trailing subset text each time ("Combo Card/Checklist" vs. "Combo
 * Cards" - a nearby section-header fragment glued onto the second copy) -
 * a real checklist never lists the exact same player on the exact same
 * team under the exact same card number twice, regardless of what its
 * subset label happens to say, so subset text is deliberately excluded
 * from the identity used here.
 * This is NOT the same thing as a legitimate shared-card-number combo/
 * League-Leaders row, which has a DIFFERENT player (or, rarely, a
 * different team) for the same card number and is deliberately left alone
 * - and is still correctly distinguished from a true duplicate by
 * validate-checklist.js's player+team+card-number duplicate check.
 */
function parseToppsChecklistPdfText(text, sport) {
  const lines = String(text || '').split(/\r?\n/);
  const rows = [];
  const indexByKey = new Map();
  for (const line of lines) {
    const row = parseChecklistLine(line, sport);
    if (!row) continue;
    const key = `${row.cardNumber}\u0001${row.player}\u0001${row.team}`;
    if (indexByKey.has(key)) {
      // Keep the first-seen row's subset text, but never let a real
      // "Rookie" marker get lost just because it happened to be the
      // second copy extracted.
      const existing = rows[indexByKey.get(key)];
      if (row.rookie && !existing.rookie) existing.rookie = true;
      continue;
    }
    indexByKey.set(key, rows.length);
    rows.push(row);
  }
  return rows;
}

/**
 * End-to-end: fetch (real HTTPS GET of a real PDF URL) -> real PDF text
 * extraction (pdf-parse's actual text layer, no OCR) -> parse -> normalize
 * -> validate. Resolves with { networkOk: false, reason } if the fetch
 * fails, { networkOk: true, format: 'pdf-no-text-layer' } if the PDF has no
 * extractable text (never falls back to OCR), or
 * { networkOk: true, rows, excluded, sourceMeta, validation, pageCount }.
 */
async function ingestToppsPdf(url, meta) {
  let fetched;
  try {
    fetched = await fetchSourceMeta(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
  } catch (err) {
    return { networkOk: false, reason: err.message, url };
  }
  if (fetched.statusCode && fetched.statusCode >= 400) {
    return { networkOk: false, reason: `HTTP ${fetched.statusCode}`, url };
  }

  // eslint-disable-next-line global-require
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: fetched.body });
  let text;
  let pageCount;
  try {
    const info = await parser.getInfo();
    pageCount = info.total;
    const textResult = await parser.getText();
    text = textResult.text || '';
  } finally {
    await parser.destroy();
  }

  if (!text.trim()) {
    return { networkOk: true, url, format: 'pdf-no-text-layer', pageCount, reason: 'PDF has no extractable text layer (would require OCR, not attempted)' };
  }

  const rawRows = parseToppsChecklistPdfText(text, meta.sport);
  const { rows, excluded } = normalizeChecklist(rawRows, meta);
  const sourceMeta = buildSourceMeta({
    sourceUrl: url,
    sourceType: 'manufacturer-checklist-pdf',
    manufacturer: meta.manufacturer,
  });
  const validation = validateChecklist(rows, { ...sourceMeta, sport: meta.sport, year: meta.year, product: meta.product });

  return { networkOk: true, url, format: 'pdf', pageCount, rows, excluded, sourceMeta, validation };
}

module.exports = { parseChecklistLine, parseToppsChecklistPdfText, ingestToppsPdf };
