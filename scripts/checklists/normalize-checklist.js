// scripts/checklists/normalize-checklist.js
//
// Turns an array of raw parsed rows (as produced by an ingest-*.js source
// parser) into the normalized checklist schema (schema.js), applying team
// alias normalization and player-name formatting/malformed-name flagging
// along the way. Never silently drops a row: a row that fails a structural
// check is excluded from `rows` but recorded (with a reason) in
// `excluded`, so nothing disappears quietly.

const { normalizeCard } = require('./schema');
const { normalizeTeam } = require('./team-alias');
const { normalizePlayerName, malformedNameReason } = require('./player-name');

/**
 * @param {Array<object>} rawRows - source-shaped rows, each expected to at
 *   least attempt cardNumber/player/team.
 * @param {object} meta - { sport, year, manufacturer, brand, product,
 *   sourceType, sourceUrl }
 * @returns {{ rows: object[], excluded: Array<{row: object, reason: string}> }}
 */
function normalizeChecklist(rawRows, meta) {
  if (!Array.isArray(rawRows)) throw new Error('normalizeChecklist: rawRows must be an array');
  const rows = [];
  const excluded = [];

  rawRows.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') {
      excluded.push({ row: raw, reason: `row ${idx}: not an object` });
      return;
    }

    const normalizedPlayer = normalizePlayerName(raw.player);
    const nameProblem = malformedNameReason(normalizedPlayer);
    if (nameProblem) {
      excluded.push({ row: raw, reason: `row ${idx}: ${nameProblem}` });
      return;
    }

    const card = normalizeCard(
      {
        ...raw,
        player: normalizedPlayer,
        team: raw.team != null ? normalizeTeam(raw.team) : null,
      },
      meta
    );

    if (!card.cardNumber) {
      excluded.push({ row: raw, reason: `row ${idx}: missing card number` });
      return;
    }

    rows.push(card);
  });

  return { rows, excluded };
}

module.exports = { normalizeChecklist };
