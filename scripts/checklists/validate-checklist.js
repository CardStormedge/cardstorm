// scripts/checklists/validate-checklist.js
//
// The verification gate: takes normalized rows + source metadata and
// decides whether a product may be marked RELEASED, must be downgraded to
// PARTIAL, or is NOT_READY. Never marks a product complete just because a
// file exists or a fetch returned 200 - every gate below has to actually
// pass. Anomalies (duplicates, gaps, mismatches) are always reported, never
// silently swallowed.

const { malformedNameReason, playerIdentityKey } = require('./player-name');

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
  // A shared card number, by itself, is completely normal in a real
  // manufacturer checklist: a multi-player insert card (e.g. a "League
  // Leaders" trio) legitimately lists several DIFFERENT players under one
  // shared card number - that is not an anomaly and must never by itself
  // downgrade an otherwise-clean product. Real example, from the
  // live-ingested 2025 Topps Series 1 Baseball file: card #5 legitimately
  // lists Tarik Skubal, Ronel Blanco and Framber Valdez as three separate
  // real rows.
  //
  // What IS a real anomaly is the SAME player (identity-normalized, so
  // "Bo Nix" vs "BO NIX" collide but "Bo Nix" vs "Bo Nix Jr." never do -
  // see player-name.js) on the SAME team appearing under the SAME card
  // number more than once - a real checklist never legitimately repeats
  // one player's identity on one card number, so this is always either a
  // true parsing-artifact duplicate or a genuinely malformed source row.
  // Real example, from the live-ingested 2024 Topps Series 1 Baseball
  // file: card #38 lists "Pete Alonso, New York Mets" twice, once with
  // subset text "Combo Card/Checklist" and once with "Combo Cards" - a
  // section-header fragment that glued onto a repeated extraction of the
  // same row, not a second real card. Subset/set-name text is
  // deliberately NOT part of this identity check for exactly that reason
  // - a genuine duplicate can have slightly different trailing subset
  // text depending on which page/column it was re-extracted from, and
  // that must not let it slip past detection.
  const cardNumberGroups = new Map(); // cardNumber -> row[]
  rows.forEach((r) => {
    const cnKey = `${r.cardNumber}`;
    if (!cardNumberGroups.has(cnKey)) cardNumberGroups.set(cnKey, []);
    cardNumberGroups.get(cnKey).push(r);
  });
  const duplicateCardNumbers = [...cardNumberGroups.entries()].filter(([, rs]) => rs.length > 1).map(([k]) => k);

  const playerCardCombos = new Map();
  rows.forEach((r) => {
    const comboKey = `${playerIdentityKey(r.player)}|${r.team || ''}|${r.cardNumber}`;
    playerCardCombos.set(comboKey, (playerCardCombos.get(comboKey) || 0) + 1);
  });
  const duplicatePlayerCardCombos = [...playerCardCombos.entries()].filter(([, n]) => n > 1).map(([k]) => k);

  if (duplicatePlayerCardCombos.length) {
    errors.push(
      `duplicate player/card-number combo(s) - the same player on the same team repeats under the same card ` +
        `number, a real parsing artifact (never a legitimate multi-player combo/insert card, which always uses a ` +
        `DIFFERENT player per row): ${duplicatePlayerCardCombos.join(', ')}`
    );
  }
  if (duplicateCardNumbers.length) {
    warnings.push(
      `card number(s) shared by more than one row: ${duplicateCardNumbers.join(', ')} - legitimate whenever each ` +
        `row under that number is a different player (e.g. a real multi-player "League Leaders"/combo card); only ` +
        `flagged as an error above when the SAME player repeats under the same number`
    );
  }
  const noDuplicates = duplicatePlayerCardCombos.length === 0;

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
