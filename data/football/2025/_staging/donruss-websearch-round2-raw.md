# 2025 Donruss — WebSearch round 2 raw evidence (weak-row resolution pass, 2026-09-04)

Source: Claude WebSearch tool results (not directly fetched/read pages — WebFetch/curl to every
external domain tried this session returns EGRESS_BLOCKED, confirmed again this pass). Each entry
below is an INDIVIDUALLY ATTRIBUTABLE listing/page returned by WebSearch — a specific eBay item
number, a specific Amazon ASIN/URL, or a specific named price-guide page (Sports Card Investor,
SportsCardsPro, ToyWiz, COMC, TradingCardsMarketplace) that itself states the card number, player,
team, and "Rated Rookie"/base-set context. Bundled/unattributed AI-synthesized search summaries with
no identifiable source page are explicitly NOT used as evidence in this round, per the task's
stricter standard.

Caveat restated: this is WebSearch result-snippet text, not a side-by-side read of the live page —
still treated as weaker than the four directly-pasted checklist sources (Checklist Insider, Beckett,
FootballCardShop, TCDB), but stronger than the earlier catch-all "searchSynthesis" bundled tier,
because each entry here names one specific, checkable listing/page.

## #375 Emeka Egbuka — Tampa Bay Buccaneers (PRIORITY — featured Team Hunt player)
- eBay: 7+ distinct listing titles naming "375 Emeka Egbuka — Tampa Bay Buccaneers — Rated Rookie"
  (base and parallel variants)
- Sports Card Investor: dedicated card page, sportscardinvestor.com/cards/emeka-egbuka-football
  (base + parallel price-guide entries)
- ToyWiz: dedicated product listing
- SportsCardsPro: sportscardspro.com/game/football-cards-2025-panini-donruss/emeka-egbuka-375
- Verdict: marketplaceSearch + sportsCardInvestor + priceGuideSite (SportsCardsPro/ToyWiz) = 3
  independently-operated named sources -> TWO_SOURCE_VERIFIED

## #312 RJ Harvey — Denver Broncos (base Rated Rookie, distinct from the Beckett autograph-parallel note)
- Amazon.com: listing "RJ Harvey RC 2025 Donruss #312 ... Rated Rookie" (dedicated ASIN page)
- Sports Card Investor: dedicated base-card price-guide page for #312
- Verdict: amazon + sportsCardInvestor = 2 -> TWO_SOURCE_VERIFIED (base checklist, independent of
  the pre-existing beckettAutographParallel note which remains recorded separately as non-base)

## #345 Will Campbell — New England Patriots (conflict resolution)
- eBay: multiple listings, all "345 Will Campbell — New England Patriots — Rated Rookie"
- Amazon.com: explicit listing "Will Campbell RC 2025 Donruss #345 ... New England Patriots"
- Zero corroboration anywhere in this search round for "LSU Tigers"
- Verdict: tcdb (pre-existing) + amazon = 2 -> TWO_SOURCE_VERIFIED. freshDCards' "LSU Tigers" value
  is preserved verbatim in its own field (never deleted), documented as a resolved outlier — every
  other source (TCDB, Amazon, eBay) independently and consistently gives "New England Patriots",
  and "LSU Tigers" is not a valid 2025 NFL team value, consistent with FreshDCards having used a
  college affiliation in that one field rather than the NFL team.

## #370 Kenneth Grant — Miami Dolphins
- eBay + Mercari: multiple listings "370 Kenneth Grant — Miami Dolphins — Rated Rookie"
- Verdict: marketplaceSearch only = 1 -> ONE_SOURCE_VERIFIED (eBay/Mercari both marketplace-type,
  not counted as two independent source types)

## #371 Gunnar Helm — Tennessee Titans
- eBay: multiple listings, e.g. "2025 Donruss #371 Gunnar Helm" (ebay.com/itm/398241611207),
  "2025 Panini Donruss Gunnar Helm RC Rookie #371 Tennessee Titans" (ebay.com/itm/389272611083)
- Verdict: marketplaceSearch only = 1 -> ONE_SOURCE_VERIFIED

## #372 Kelvin Banks Jr. — New Orleans Saints
- eBay: "Kelvin Banks Jr. 2025 Donruss #372" (ebay.com/itm/146879252283), "2025 Donruss #372
  Kelvin Banks Jr. Press Proofs Purple" (ebay.com/itm/358328251265)
- SportsCardsPro: sportscardspro.com/game/football-cards-2025-panini-donruss/kelvin-banks-jr-372
- Verdict: marketplaceSearch + priceGuideSite = 2 -> TWO_SOURCE_VERIFIED

## #373 Harold Fannin Jr. — Cleveland Browns
- eBay: multiple listings, e.g. "2025 Donruss #373 Harold Fannin Jr." (ebay.com/itm/168021318587)
- Amazon.com: "2025 Donruss #373 Harold Fannin Jr. Rookie RC Football Card"
  (amazon.com/Donruss-Harold-Fannin-Rookie-Football/dp/B0GK4XRYRJ)
- Sports Card Investor: dedicated Optic Preview Red Wave page for #373
- Verdict: marketplaceSearch + amazon + sportsCardInvestor = 3 -> TWO_SOURCE_VERIFIED

## #374 Jordan James — San Francisco 49ers
- eBay: "2025 Donruss Football #374 - Jordan James RC - San Francisco 49ers"
  (ebay.com/itm/800226983206)
- TradingCardsMarketplace.com: dedicated product listing "2025 Donruss Optic Pink Jordan James
  Trading Cards RC" naming #374
- Verdict: marketplaceSearch + priceGuideSite = 2 -> TWO_SOURCE_VERIFIED

## #376 Josaiah Stewart — Los Angeles Rams
- eBay: "2025 Donruss Football #376 - Josaiah Stewart RC - Los Angeles Rams"
  (ebay.com/itm/800055653827)
- COMC: comc.com dedicated product page for #376 Josaiah Stewart Jersey Number parallel
- SportsCardsPro: dedicated base-card price-guide page for #376
- Verdict: marketplaceSearch + priceGuideSite = 2 -> TWO_SOURCE_VERIFIED

## #377 Woody Marks — Houston Texans
- eBay: "2025 Panini Donruss Rated ROOKIE Woody Marks #377 — Houston Texans"
  (ebay.com/itm/267622643219)
- Amazon.com: "2025 Donruss #377 Woody Marks Rookie RC Football Card"
  (amazon.com/Donruss-Woody-Marks-Rookie-Football/dp/B0GK4J8NY5) and a second Amazon listing
  ("WOODY MARKS RC 2025 Donruss #377 NM-MT Football Texans Rated Rookie")
- Sports Card Investor: dedicated Optic Preview Pink and Season Stat Line pages for #377
- Verdict: marketplaceSearch + amazon + sportsCardInvestor = 3 -> TWO_SOURCE_VERIFIED

## #378 Kalel Mullings — Tennessee Titans
- eBay: "QTY: 2025 Panini Donruss - Kalel Mullings ( Tennessee Titans ) Rated Rookie #378"
  (ebay.com/itm/257415234015)
- SportsCardsPro: dedicated base-card and Press Proof Yellow price-guide pages for #378
- COMC: comc.com dedicated Press Proof Purple product page for #378
- Verdict: marketplaceSearch + priceGuideSite = 2 -> TWO_SOURCE_VERIFIED

## #379 Darius Alexander — New York Giants
- eBay: "2025 Donruss Football Rated Rookie #379 Darius Alexander (RC)"
  (ebay.com/itm/257125241993), "2025 Donruss #379 Darius Alexander Press Proofs Yellow New York
  Giants Rookie" (ebay.com/itm/336482886953)
- Amazon.com: "DARIUS ALEXANDER RC 2025 Donruss #379 NM-MT Football NY Giants Rated Rookie"
  (amazon.com/DARIUS-ALEXANDER-Donruss-Football-Giants/dp/B0G1JDCCFL)
- Verdict: marketplaceSearch + amazon = 2 -> TWO_SOURCE_VERIFIED

## #380 Andrew Mukuba — Philadelphia Eagles
- eBay: "Andrew Mukuba Rookie #380 2025 Donruss Philadelphia Eagles" (ebay.com/itm/227433335887)
- Amazon.com: "Andrew Mukuba RC 2025 Donruss #380 NM-MT Football Eagles Rated Rookie"
  (us.amazon.com/Andrew-Mukuba-Donruss-Football-Eagles/dp/B0G3JLWGBK) and a second Amazon listing
  for the Optic Preview Pink parallel
- SportsCardsPro: dedicated Pink Preview price-guide page for #380
- Verdict: marketplaceSearch + amazon + priceGuideSite = 3 -> TWO_SOURCE_VERIFIED

## #381 Donovan Jackson — Minnesota Vikings
- eBay: "2025 Panini Donruss Donovan Jackson #381 Rated Rookie Minnesota Vikings"
  (ebay.com/itm/158000492495), "2025 Donruss #381 Donovan Jackson Rookie" (ebay.com/itm/127620612665)
- Sports Card Investor: dedicated Rated Rookie Autographs price-guide page for #381
- SportsCardsPro: dedicated base-card price-guide page for #381
- No Amazon listing found in this round.
- Verdict: marketplaceSearch + sportsCardInvestor + priceGuideSite = 3 -> TWO_SOURCE_VERIFIED

## #382 Tyler Loop — Baltimore Ravens
- eBay: "Tyler Loop Ravens 2025 Donruss Rated Rookie #382 NFL Kicker" (ebay.com/itm/127543717320),
  "2025 Donruss #382 Tyler Loop Ravens RC" (ebay.com/itm/287270604019)
- Amazon.com: "2025 Donruss #382 Tyler Loop RC Rated Rookie Baltimore Ravens NFL Football Base
  Trading Card" (amazon.com/Donruss-Rookie-Baltimore-Football-Trading/dp/B0GGC4HDQN)
- Verdict: marketplaceSearch + amazon = 2 -> TWO_SOURCE_VERIFIED

## Independence note for this round

`marketplaceSearch` (eBay/Mercari/Whatnot — individual seller listings) is treated as ONE source
type regardless of how many distinct sellers/listings appear, consistent with the rest of this
evidence table (see #398's footballCardShop+searchSynthesis precedent, sourceCount=1). `amazon`,
`sportsCardInvestor`, and `priceGuideSite` (SportsCardsPro/ToyWiz/COMC/TradingCardsMarketplace) are
each independently-operated cataloging/retail services, distinct in operator and format from
marketplace listings and from each other, and are counted as separate source types toward the
TWO_SOURCE_VERIFIED gate only when the specific listing/page individually names card number,
player, team, and Rated Rookie/base-set context — never from a bundled/unattributed search summary.
