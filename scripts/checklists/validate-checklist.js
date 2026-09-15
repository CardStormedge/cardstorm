// scripts/checklists/validate-checklist.js
//
// The verification gate: takes normalized rows + source metadata and
// decides whether a product may be marked RELEASED, must be downgraded to
// PARTIAL, or is NOT_READY. Never marks a product complete just because a
// file exists or a fetch returned 200 - every gate below has to actually
// pass. Anomalies (duplicates, gaps, mismatches) are always reported, never
// silently swallowed.

const { malformedNameReason } = require('./player-name');

/**
 * @param {object[]} rows - normalized rows (schema.js shape)
 * @param {object} sourceMeta - { sourceUrl, sourceType, manufacturer, sport,
 *   year, product, expectedCardCount (optional) }
 * @returns {{
 *   status: 'RELEASED'|'PARTIAL'|'NOT_READY',
 *   errors: string[],
 *   warnings: string[],
 *   duplicateCardNumbers: string[],
 *   duplicatePlayerCardCombos: string[],
 *   missingCardNumbers: (string|number)[],
 *   malformedNames: string[],
 *   passedRowCount: number,
 *   gate: { sourceVerified: boolean, yearVerified: boolean, sportVerified: boolean,
 *           productVerified: boolean, cardNumbersParsed: boolean, playerTeamExtracted: boolean,
 *           noDuplicates: boolean, countSanity: boolean }
 * }}
 */
function validateChecklist(rows, sourceMeta) {
  if (!Array.isArray(rows)) throw new Error('validateChecklist: rows must be an array');
  if (!sourceMeta || typeof sourceMeta !== 'object') {
    throw new Error('validateChecklist: sourceMeta is required');
  }

  const errors = [];
  const warnings = [];

  // ---- source traceability -------------------------------------------------
  const sourceVerified = !!(sourceMeta.sourceUrl && sourceMeta.sourceType && sourceMeta.manufacturer);
  if (!sourceVerified) errors.push('missing source metadata (sourceUrl / sourceType / manufacturer)');

  // ---- sport / year / product identity --------------------------------------------
  const sportVerified = rows.length > 0 && rows.every((r) => r.sport === sourceMeta.sport);
  const yearVerified = rows.length > 0 && rows.every((r) => r.year === sourceMeta.year);
  const productVerified = rows.length > 0 && rows.every((r) => r.product === sourceMeta.product);
  if (rows.length === 0) errors.push('no rows to verify (empty checklist)');
  if (rows.length > 0 && !sportVerified) errors.push('one or more rows have a sport mismatch against sourceMeta.sport');
  if (rows.length > 0 && !yearVerified) errors.push('one or more rows have a year mismatch against sourceMeta.year');
  if (rows.length > 0 && !productVerified) errors.push('one or more rows have a product mismatch against sourceMeta.product');

  // ---- card numbers parsed ---------------------------------------------------
  const cardNumbersParsed = rows.every((r) => r.cardNumber != null && String(r.cardNumber).trim() !== '');
  if (!cardNumbersParsed) errors.push('one or more rows are missing a parsed card number');

  // ---- player/team extracted --------------------------------------------------
  const malformedNames = [];
  rows.forEach((r) => {
    const reason = malformedNameReason(r.player);
    if (reason) malformedNames.push(`#${r.cardNumber ?? '?'}: ${reason}`);
  });
  const playerTeamExtracted = malformedNames.length === 0 && rows.every((r) => !!r.player);
  if (malformedNames.length) warnings.push(...malformedNames.map((m) => `malformed name - ${m}`));

  // ---- duplicate detection -----------------------------------------------------
  const cardNumberCounts = new Map();
  const playerCardCombos = new Map();
  rows.forEach((r) => {
    const cnKey = `${r.cardNumber}`;
    cardNumberCounts.set(cnKey, (cardNumberCounts.get(cnKey) || 0) + 1);
    const comboKey = `${r.player}|${r.cardNumber}`;
    playerCardCombos.set(comboKey, (playerCardCombos.get(comboKey) || 0) + 1);
  });
  const duplicateCardNumbers = [...cardNumberCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  const duplicatePlayerCardCombos = [...playerCardCombos.entries()].filter(([, n]) => n > 1).map(([k]) => k);
  if (duplicateCardNumbers.length) errors.push(`duplicate card number(s): ${duplicateCardNumbers.join(', ')}`);
  if (duplicatePlayerCardCombos.length) {
    errors.push(`duplicate player/card-number combo(s): ${duplicatePlayerCardCombos.join(', ')}`);
  }
  const noDuplicates = duplicateCardNumbers.length === 0 && duplicatePlayerCardCombos.length === 0;

  // ---- missing card numbers (gap detection, numeric ranges only) --------------
  const missingCardNumbers = [];
  const numericCardNumbers = rows
    .map((r) => Number(r.cardNumber))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (numericCardNumbers.length === rows.length && numericCardNumbers.length > 1) {
    const min = numericCardNumbers[0];
    const max = numericCardNumbers[numericCardNumbers.length - 1];
    const present = new Set(numericCardNumbers);
    for (let n = min; n <= max; n++) if (!present.has(n)) missingCardNumbers.push(n);
    if (missingCardNumbers.length) {
      warnings.push(`gap(s) in numeric card-number sequence ${min}-${max}: ${missingCardNumbers.join(', ')}`);
    }
  }

  // ---- count sanity vs expected -------------------------------------------------
  let countSanity = true;
  if (typeof sourceMeta.expectedCardCount === 'number') {
    countSanity = rows.length === sourceMeta.expectedCardCount;
    if (!countSanity) {
      warnings.push(
        `parsed row count (${rows.length}) does not match expected count (${sourceMeta.expectedCardCount})`
      );
    }
  }

  const gate = {
    sourceVerified,
    yearVerified,
    sportVerified,
    productVerified,
    cardNumbersParsed,
    playerTeamExtracted,
    noDuplicates,
    countSanity,
  };

  const allPass = Object.values(gate).every(Boolean) && errors.length === 0;
  const somePass = Object.values(gate).some(Boolean);

  let status;
  if (allPass) status = 'RELEASED';
  else if (somePass && rows.length > 0) status = 'PARTIAL';
  else status = 'NOT_READY';

  return {
    status,
    errors,
    warnings,
    duplicateCardNumbers,
    duplicatePlayerCardCombos,
    missingCardNumbers,
    malformedNames,
    passedRowCount: rows.length,
    gate,
  };
}

module.exports = { validateChecklist };
