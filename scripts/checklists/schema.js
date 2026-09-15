// scripts/checklists/schema.js
//
// The normalized checklist-row schema every ingestion source (Topps, Panini,
// any future source) is converted into, and the source-metadata shape kept
// per product. Style follows this repo's existing normalizeDonruss /
// normalizePrizm / normalizeSelect convention in app.html: only fields the
// source actually supports are populated; anything the source doesn't
// support stays `null`, never guessed or defaulted to a non-null value.
//
// This module is intentionally independent of api/lib/cardProviders/ (the
// card-image-provider POC from PR #27) - it is not imported by, and does
// not import, anything under api/lib/cardProviders/, and this PR never
// modifies that directory.

const FIELDS = [
  'sport',
  'year',
  'manufacturer',
  'brand',
  'product',
  'setName',
  'subset',
  'cardNumber',
  'player',
  'team',
  'rookie',
  'insert',
  'parallel',
  'autograph',
  'relic',
  'shortPrint',
  'sourceType',
  'sourceUrl',
  'verificationStatus',
];

const VERIFICATION_STATUSES = ['RELEASED', 'PARTIAL', 'NOT_READY'];

/**
 * Builds one normalized checklist row. Any field not present in `raw` (or
 * explicitly passed as undefined) is stored as `null`, never fabricated or
 * defaulted to a guess. Booleans (rookie/insert/parallel/autograph/relic/
 * shortPrint) default to `false` only when the source's schema is known to
 * always distinguish that property (i.e. absence means "confirmed no"),
 * never when the source simply didn't cover it - callers must pass an
 * explicit boolean for those five fields; passing `undefined` stores `null`
 * ("source doesn't say") rather than assuming false.
 */
function normalizeCard(raw, meta) {
  if (!raw || typeof raw !== 'object') throw new Error('normalizeCard: raw row is required');
  if (!meta || typeof meta !== 'object') throw new Error('normalizeCard: source meta is required');

  const row = {};
  for (const field of FIELDS) row[field] = null;

  row.sport = meta.sport || null;
  row.year = meta.year || null;
  row.manufacturer = meta.manufacturer || null;
  row.brand = meta.brand || null;
  row.product = meta.product || null;
  row.setName = raw.setName != null ? String(raw.setName) : null;
  row.subset = raw.subset != null ? String(raw.subset) : null;
  row.cardNumber = raw.cardNumber != null ? String(raw.cardNumber).trim() : null;
  row.player = raw.player != null ? String(raw.player).trim() : null;
  row.team = raw.team != null ? String(raw.team).trim() : null;

  for (const boolField of ['rookie', 'insert', 'parallel', 'autograph', 'relic', 'shortPrint']) {
    row[boolField] = typeof raw[boolField] === 'boolean' ? raw[boolField] : null;
  }

  row.sourceType = meta.sourceType || null;
  row.sourceUrl = meta.sourceUrl || null;
  row.verificationStatus = null; // set later by validate-checklist.js, never guessed here

  return row;
}

/** Per-product source metadata retained alongside its normalized rows. */
function buildSourceMeta({
  sourceUrl,
  sourceType,
  sourceDate = null,
  manufacturer,
  parseDate = new Date().toISOString(),
  parserVersion = null,
  verificationStatus = 'NOT_READY',
}) {
  if (!sourceUrl) throw new Error('buildSourceMeta: sourceUrl is required for traceability');
  if (!sourceType) throw new Error('buildSourceMeta: sourceType is required for traceability');
  if (!manufacturer) throw new Error('buildSourceMeta: manufacturer is required');
  if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
    throw new Error(`buildSourceMeta: verificationStatus must be one of ${VERIFICATION_STATUSES.join(', ')}`);
  }
  return { sourceUrl, sourceType, sourceDate, manufacturer, parseDate, parserVersion, verificationStatus };
}

module.exports = { FIELDS, VERIFICATION_STATUSES, normalizeCard, buildSourceMeta };
