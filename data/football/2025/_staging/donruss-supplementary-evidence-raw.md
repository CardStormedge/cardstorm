# 2025 Donruss — supplementary evidence (marketplace/search-corroborated, conflicting, and non-base)

All entries here are explicitly weaker or structurally different from the four named
directly-reviewable checklist sources (Checklist Insider, Beckett, FootballCardShop, TCDB) and are
tracked separately for that reason.

## #370-382 — "multiple marketplace/search sources agree" (bundled, unnamed)

Supplied by the user as a single bundled claim, not attributed to one specific reviewable page.
Per instruction, treated conservatively — status `SEARCH_SYNTHESIS_UNCONFIRMED`, not counted
toward the two-source gate:

```
370 Kenneth Grant — Miami Dolphins
371 Gunnar Helm — Tennessee Titans
372 Kelvin Banks Jr. — New Orleans Saints
373 Harold Fannin Jr. — Cleveland Browns
374 Jordan James — San Francisco 49ers
375 Emeka Egbuka — Tampa Bay Buccaneers
376 Josaiah Stewart — Los Angeles Rams
377 Woody Marks — Houston Texans
378 Kalel Mullings — Tennessee Titans
379 Darius Alexander — New York Giants
380 Andrew Mukuba — Philadelphia Eagles
381 Donovan Jackson — Minnesota Vikings
382 Tyler Loop — Baltimore Ravens
```

## #345 — FreshDCards team conflict

FreshDCards article lists Will Campbell #345's team as **"LSU Tigers"** — a college team, not an
NFL team — while TCDB independently lists him at the same number with **"New England Patriots"**.
Per explicit instruction, this was **not** normalized away. Recorded as `SOURCE_CONFLICT` in the
evidence table; TCDB's value is shown at top level (as the more plausible/higher-tier value —
"LSU Tigers" cannot be a 2025 NFL team field regardless), but the FreshDCards claim itself is
preserved verbatim in the evidence table's `freshDCards` field for #345, not discarded.

## #312 — Beckett Rated Rookies Autographs Orange (non-base subset)

Beckett's checklist evidence shows **312 RJ Harvey — Denver Broncos** in its "Rated Rookies
Autographs Orange" section — a parallel/autograph product tier that reuses the Base Rated Rookie
numbering, not the base checklist itself. Per explicit instruction, this does not promote #312 to
base-checklist-verified status on its own. Kept at `SEARCH_SYNTHESIS_UNCONFIRMED` (same tier as
the original web-search result for the same player/team), with this autograph-parallel evidence
recorded as a supporting note in the main evidence table, not as base-checklist proof.

## #400 — additional named corroboration for Jaxson Dart

The user's message states Sports Card Investor and FreshDCards additionally confirm "400 Jaxson
Dart — New York Giants — Rated Rookie," alongside FootballCardShop's direct listing. Neither
source's exact raw text was supplied verbatim (unlike Checklist Insider/Beckett/FootballCardShop/
TCDB above, which were all pasted as literal text blocks) — only the player/team claim itself was
relayed. Recorded in the evidence table as named-source corroboration for #400
(`TWO_SOURCE_VERIFIED`, footballCardShop + at least one of freshDCards/sportsCardInvestor), with
an explicit note that this is weaker evidence of independence than the formatting-divergence cases
(Beckett vs. FootballCardShop, TCDB vs. FootballCardShop) because there's no raw text to compare
formatting against.
