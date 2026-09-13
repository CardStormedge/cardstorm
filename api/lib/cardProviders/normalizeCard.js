// Normalizes a raw provider card record into CardStorm's shared shape.
// Every field is populated ONLY if the provider actually returned it -
// never guessed, never defaulted to a plausible-looking value. A field
// the provider didn't supply stays null so the UI (when this is ever
// wired to one) can render an honest "not available" state instead of a
// fabricated one, matching CardStorm's existing sourcing conventions
// (see data/goat/goat-vault.json's own null-until-verified fields).
//
// verificationStatus values:
//  - "PROVIDER_MATCHED"   the provider returned exactly one confident match
//  - "PROVIDER_AMBIGUOUS" the provider returned multiple candidate matches
//                         for the same search - never auto-picked one
//  - "PROVIDER_NO_MATCH"  the provider ran the search but found nothing
//  - "PROVIDER_ERROR"     the provider call itself failed (network/auth/etc)

const VALID_VERIFICATION_STATUSES = [
  "PROVIDER_MATCHED",
  "PROVIDER_AMBIGUOUS",
  "PROVIDER_NO_MATCH",
  "PROVIDER_ERROR",
];

function normalizeCard(raw, { provider, verificationStatus, confidence = null }) {
  if (!VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
    throw new Error(`normalizeCard: invalid verificationStatus "${verificationStatus}"`);
  }
  // No raw record to normalize (no-match / error cases) - return the shell
  // with every card field null rather than throwing, so callers can still
  // report the search outcome uniformly.
  if (!raw) {
    return {
      provider,
      providerCardId: null,
      player: null,
      sport: null,
      year: null,
      manufacturer: null,
      brand: null,
      set: null,
      cardNumber: null,
      parallel: null,
      frontImageUrl: null,
      backImageUrl: null,
      sourceUrl: null,
      confidence,
      verificationStatus,
    };
  }
  return {
    provider,
    providerCardId: raw.providerCardId ?? null,
    player: raw.player ?? null,
    sport: raw.sport ?? null,
    year: raw.year ?? null,
    manufacturer: raw.manufacturer ?? null,
    brand: raw.brand ?? null,
    set: raw.set ?? null,
    cardNumber: raw.cardNumber ?? null,
    parallel: raw.parallel ?? null,
    frontImageUrl: raw.frontImageUrl ?? null,
    backImageUrl: raw.backImageUrl ?? null,
    sourceUrl: raw.sourceUrl ?? null,
    confidence,
    verificationStatus,
  };
}

module.exports = { normalizeCard, VALID_VERIFICATION_STATUSES };
