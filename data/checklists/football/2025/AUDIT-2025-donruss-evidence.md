# 2025 Donruss Base Rated Rookie — multi-source evidence audit (2026-09-04)

Not wired into production. `CHECKLIST_MANIFEST` has no `'football|2025'` key; this audit does not
add one. See `data/football/2025/_staging/donruss-base-rated-rookie-evidence.json` for the live
evidence table and `donruss-base-rated-rookie-evidence.csv` for the same data as a spreadsheet.

## Strategy change from the prior pass

Checklist Insider was originally treated as a candidate "Source 1" to be completed to 100 rows
before normalizing. It only ever supplied 10 rows (#301-310). Rather than block on one source
reaching 100, the approach shifted to a **provenance-aware evidence table**: every card number can
carry evidence from one or more sources, each preserved distinctly, with a verification status
computed per row from however many sources actually cover it.

## A. Total unique Base Rated Rookie card numbers now sourced
**36** of the required 100 (#301-334, plus #398-399 near the tail).

## B. Beckett-only rows
1 — **#313** (Tez Johnson, Tampa Bay Buccaneers). Everything else Beckett supplied (#301-311,
314-325) overlaps with another source.

## C. FootballCardShop-only rows
9 — **#326-334** (Trevor Etienne, Kyle Williams, Mason Taylor, Tre Harris III, Quinshon Judkins,
Tai Felton, TreVeyon Henderson, Bhayshul Tuten, Jayden Higgins).

## D. Checklist Insider-only rows
**0** — all 10 Checklist Insider rows (#301-310) are also covered by Beckett.

## E. Multi-source matches
**22 rows**, all `TWO_SOURCE_VERIFIED`, zero disagreements:
- **#301-310** (10 rows): Checklist Insider + Beckett agree on player and team.
- **#314-325** (12 rows): Beckett + FootballCardShop agree on player and team (team compared after
  expanding FootballCardShop's abbreviations to full names).

## F. Conflicts
**0.** No `PLAYER_MISMATCH` or `TEAM_MISMATCH` found anywhere in the 22 overlapping rows.

## G. Missing numbers inside currently covered ranges
**1** — **#312**, explicitly confirmed absent from Beckett's supplied excerpt (not assumed). See
below for its resolution status.

## H. Status of #312
A web search (not a directly-suppliable/reviewable page — this session cannot fetch
checklistinsider.com, beckett.com, cardsmithsbreaks.com, or footballcardshop.com directly, all
`EGRESS_BLOCKED`) returned **RJ Harvey, Denver Broncos** for #312. This is recorded with status
`SEARCH_SYNTHESIS_UNCONFIRMED` — a real candidate, worth keeping, but explicitly weaker than the
directly-supplied rows and **not** counted toward any verification gate. It needs a real,
human-reviewable source (a screenshot, a copy-pasted excerpt, or a page Claude can actually open)
before it can move to `ONE_SOURCE_VERIFIED`.

## I. Highest confirmed card number
**#399** (Xavier Watts, Atlanta Falcons) — also `SEARCH_SYNTHESIS_UNCONFIRMED`, same caveat as
#312. #400 remains completely unresolved (search did not surface a player, only that it's "the
final card in the base set").

## J. Featured seven coverage by Donruss subset

| Player | Base Rated Rookie #301-400 | Other subset evidence | Notes |
|---|---|---|---|
| Travis Hunter | **#301** — `TWO_SOURCE_VERIFIED` (Checklist Insider + Beckett) | — | |
| Ashton Jeanty | **#305** — `TWO_SOURCE_VERIFIED` (Checklist Insider + Beckett) | — | |
| Matthew Golden | **#311** — `ONE_SOURCE_VERIFIED` (Beckett only) | — | |
| Tetairoa McMillan | **#314** — `TWO_SOURCE_VERIFIED` (Beckett + FootballCardShop) | — | |
| Cam Ward | **ABSENT** from #301-334, #398-399 | Rated Rookies Throwback **#25** — `SEARCH_SYNTHESIS_UNCONFIRMED` (multi-corroborated across eBay/SportsCardsPro/Sports Card Investor, but no page directly read) | Kept in a separate file (`donruss-other-rookie-subsets.json`), never merged into Base Rated Rookie |
| Jaxson Dart | **ABSENT** from #301-334, #398-399 | Rated Rookies Retro **#1** — `SEARCH_SYNTHESIS_UNCONFIRMED` (unusually strong multi-retailer corroboration: 6+ eBay listings, SportsCardsPro, HobbyScan, ToyWiz) | Same — kept separate |
| Emeka Egbuka | **ABSENT** from all evidence gathered (including the unresolved #335-397/#400 gap) | None found | Not confirmed absent from the product overall — just absent from everything found so far |

## K. Remaining acquisition gap to reach #301-400
**64 numbers**: **#335-397** (63 numbers) and **#400** (1 number). No sequential guessing, no
roster-based inference was used to fill any of these — they are simply unresolved.

## L. Confirmation production remains unchanged
Confirmed — zero `app.html` changes, no `CHECKLIST_MANIFEST` entry, no Team Hunt activation, no
Fanatics/Gear Up/2024 Optic changes this pass.

## Independence assessment (why 22 rows were allowed to reach TWO_SOURCE_VERIFIED)

Per instruction, independence was not assumed just because the URLs differ. Evidence considered:

- **Formatting differs between paired sources.** Checklist Insider appends an explicit "RC" tag
  Beckett's excerpt doesn't; FootballCardShop gives team abbreviations ("CAR") where Beckett gives
  full names ("Carolina Panthers"). Two sources copied from the same underlying extraction (the
  2024 Optic TCDB case) matched down to formatting quirks — these do not.
- **Coverage boundaries don't align.** FootballCardShop's supplied range (314-334) doesn't start
  or stop where Beckett's does (301-325, minus 312) — inconsistent with one being a trimmed copy
  of the other.
- **Caveat, stated plainly:** this assessment is based on the text blocks the user supplied
  directly, not a side-by-side reading of the live pages (both source domains are
  `EGRESS_BLOCKED` for direct fetch this session). It's a reasoned judgment call, not a certainty
  — a human spot-check of the actual live pages before this data ever reaches
  `CHECKLIST_MANIFEST` is recommended, same as every other verification gate this session has
  required before production wiring.
