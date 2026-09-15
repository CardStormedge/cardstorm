// scripts/checklists/player-name.js
//
// Player-name normalization and malformed-name detection. The guiding rule:
// normalize *formatting* (whitespace, punctuation around a suffix, accent
// representation) without ever normalizing away information that
// distinguishes two different people. "Bo Nix" and "Bo Nix Jr." must stay
// two different identity keys - collapsing a suffix would risk merging a
// player with their same-named relative into one (fabricated) identity.

const SUFFIX_RE = /\b(Jr\.?|Sr\.?|II|III|IV|V)\.?$/i;

/**
 * Cleans up formatting only: trims, collapses internal whitespace, applies
 * Unicode NFC normalization (so visually-identical accented names compare
 * equal regardless of source encoding), and standardizes suffix punctuation
 * ("Bo Nix, Jr." / "Bo Nix JR" -> "Bo Nix Jr."). Does not remove or reorder
 * any name part, so it never merges distinct people.
 */
function normalizePlayerName(name) {
  if (name == null) return null;
  let n = String(name).normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!n) return null;
  n = n.replace(/,\s*(Jr\.?|Sr\.?|II|III|IV|V)\.?$/i, ' $1');
  const m = n.match(SUFFIX_RE);
  if (m) {
    const suffix = m[1].replace(/\.$/, '');
    const canonicalSuffix = /^(Jr|Sr)$/i.test(suffix)
      ? suffix[0].toUpperCase() + suffix.slice(1).toLowerCase() + '.'
      : suffix.toUpperCase();
    n = n.slice(0, m.index).trim() + ' ' + canonicalSuffix;
  }
  return n;
}

/**
 * Flags names that are almost certainly parse errors rather than real
 * players - empty, digits-only, leftover HTML entities/tags, a single
 * character, or absurdly long (concatenated-row parse bug). Returns a
 * reason string, or null if the name looks structurally sound. This is a
 * structural sanity check only - it does not and cannot verify the name is
 * a real person; that verification comes from the source itself.
 */
function malformedNameReason(name) {
  if (name == null) return 'missing player name';
  const n = String(name).trim();
  if (!n) return 'empty player name';
  if (/^\d+$/.test(n)) return 'player name is all digits';
  if (/<[^>]+>/.test(n)) return 'player name contains unstripped HTML markup';
  if (/&[a-z]+;|&#\d+;/i.test(n)) return 'player name contains an unresolved HTML entity';
  if (n.length < 2) return 'player name is a single character';
  if (n.length > 60) return 'player name is implausibly long (likely a parse/concatenation error)';
  if (!/[A-Za-z]/.test(n)) return 'player name has no letters';
  return null;
}

/**
 * Identity key for duplicate detection / roster linkage: SAFE normalization
 * only - case folding, accent folding, punctuation/whitespace
 * normalization, and standard literal suffix handling (via
 * normalizePlayerName above). This is comparison-only: the row's own
 * displayed player name (from normalizePlayerName / the source) is never
 * altered by this function, only the key used to decide "is this the same
 * person as that other row".
 *
 * What this deliberately does NOT do: fuzzy/phonetic matching, nickname
 * guessing, or merging two names that differ by more than case/accent/
 * punctuation/whitespace. Real example this exists for: a real 2025 Topps
 * Series 1 Baseball row for "Jung Hoo Lee" and another for "Jung HOO Lee"
 * (a real PDF-extraction casing inconsistency, same real player, same real
 * card #277) must collide here; "Ronald Acuna Jr." (CardStorm's roster
 * spelling) and "Ronald Acuña Jr." (the real Topps PDF's spelling) must
 * also collide here for roster-linkage purposes. Two genuinely different
 * players (e.g. "Mike Trout" and "Mike Tauchman") must never collide, and
 * never do, since nothing here does substring/phonetic/fuzzy comparison -
 * only exact-after-safe-normalization comparison.
 */
function playerIdentityKey(name) {
  const normalized = normalizePlayerName(name);
  if (!normalized) return null;
  return normalized
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents/diacritics for comparison only
    .toLowerCase()
    .replace(/[.,'’]/g, '') // punctuation-normalize (periods, commas, apostrophe variants)
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { normalizePlayerName, malformedNameReason, playerIdentityKey };
