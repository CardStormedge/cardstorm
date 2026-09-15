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
 * Identity key for duplicate detection: normalized name, case-folded. Two
 * rows only collide here if their formatted names are identical after
 * normalization - a different suffix (or no suffix) yields a different key
 * on purpose.
 */
function playerIdentityKey(name) {
  const normalized = normalizePlayerName(name);
  return normalized ? normalized.toLowerCase() : null;
}

module.exports = { normalizePlayerName, malformedNameReason, playerIdentityKey };
