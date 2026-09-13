// Normalizes a provider sold-sale record into the same comp shape/vocabulary
// already used by data/intelligence/grail-board.json - so if a provider
// ever proves reliable enough to inform (never silently replace) that
// pipeline, the shapes already match. This does NOT feed CardStorm's real
// sold-comp pipeline; it exists for this POC's own reporting only.
//
// compType mirrors grail-board.json's _compLabelGuide exactly:
//  - EXACT_CERT_CONFIRMED   the source ties a specific physical cert/slab
//                           serial to this exact transaction
//  - SAME_CARD_AND_GRADE_COMP  a real completed sale of the same card+grade,
//                           not proven to be this exact physical copy
//  - SIMILAR_ITEM_COMP      related but not identical card/grade
//  - UNVERIFIED             match confidence too low to label as a comp at
//                           all - CardStorm's rule is "no verified recent
//                           sale loaded" beats a false-confident guess
//
// listingType must be a genuinely completed sale type. Anything that looks
// like an active/current listing is rejected outright - "no asking prices,
// no active listings" is enforced here in code, not left to a caller's
// discipline.
const ACTIVE_LISTING_TYPES = new Set(["active", "for_sale", "asking", "bin_active", "current_listing"]);
const COMPLETED_LISTING_TYPES = new Set(["auction", "fixed_price", "best_offer", "sold"]);

function classifyCompType(matchResult, hasSlabSerialMatch) {
  if (hasSlabSerialMatch) return "EXACT_CERT_CONFIRMED";
  if (matchResult.score >= 0.85 && matchResult.comparableFieldCount >= 3) return "SAME_CARD_AND_GRADE_COMP";
  if (matchResult.score >= 0.5) return "SIMILAR_ITEM_COMP";
  return "UNVERIFIED";
}

function normalizeSaleComp(saleRecord, matchResult, { provider, hasSlabSerialMatch = false } = {}) {
  if (!saleRecord) {
    return {
      provider,
      providerSaleId: null,
      salePrice: null,
      saleDate: null,
      marketplace: null,
      listingType: null,
      isCompletedSale: false,
      compType: "UNVERIFIED",
      matchScore: 0,
      matchedFields: [],
      mismatchedFields: [],
      imageUrl: null,
      sourceUrl: null,
      verificationStatus: "PROVIDER_NO_MATCH",
      notice: "No verified recent sale loaded.",
    };
  }

  const listingType = saleRecord.listingType ? String(saleRecord.listingType).toLowerCase() : null;
  const isActiveListing = listingType ? ACTIVE_LISTING_TYPES.has(listingType) : false;
  const isCompletedSale = listingType ? COMPLETED_LISTING_TYPES.has(listingType) : false;

  // Hard rule, enforced in code: an active/asking-price listing is never
  // returned as if it were a comp, no matter how good the field match is.
  if (isActiveListing) {
    return {
      provider,
      providerSaleId: saleRecord.providerSaleId ?? null,
      salePrice: null,
      saleDate: null,
      marketplace: saleRecord.marketplace ?? null,
      listingType,
      isCompletedSale: false,
      compType: "UNVERIFIED",
      matchScore: matchResult ? matchResult.score : 0,
      matchedFields: matchResult ? matchResult.matchedFields : [],
      mismatchedFields: matchResult ? matchResult.mismatchedFields : [],
      imageUrl: null,
      sourceUrl: saleRecord.sourceUrl ?? null,
      verificationStatus: "PROVIDER_NO_MATCH",
      notice: "Rejected: this is an active/asking-price listing, not a completed sale - never used as a comp.",
    };
  }

  const compType = classifyCompType(matchResult || { score: 0, comparableFieldCount: 0 }, hasSlabSerialMatch);

  return {
    provider,
    providerSaleId: saleRecord.providerSaleId ?? null,
    salePrice: saleRecord.salePrice ?? null,
    saleDate: saleRecord.saleDate ?? null,
    marketplace: saleRecord.marketplace ?? null,
    listingType,
    isCompletedSale,
    compType,
    matchScore: matchResult ? matchResult.score : 0,
    matchedFields: matchResult ? matchResult.matchedFields : [],
    mismatchedFields: matchResult ? matchResult.mismatchedFields : [],
    imageUrl: saleRecord.imageUrl ?? null,
    sourceUrl: saleRecord.sourceUrl ?? null,
    verificationStatus: compType === "UNVERIFIED" ? "PROVIDER_AMBIGUOUS" : "PROVIDER_MATCHED",
    notice: !isCompletedSale ? "listingType could not be confirmed as a completed sale - treat with caution." : null,
  };
}

module.exports = { normalizeSaleComp, classifyCompType, ACTIVE_LISTING_TYPES, COMPLETED_LISTING_TYPES };
