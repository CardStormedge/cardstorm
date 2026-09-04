# 2025 Donruss Base Rated Rookie — multi-source evidence audit

Not wired into production. `CHECKLIST_MANIFEST` has no `'football|2025'` key; this audit does not
add one. See `data/football/2025/_staging/donruss-base-rated-rookie-evidence.json` for the live
evidence table and `donruss-base-rated-rookie-evidence.csv` for the same data as a spreadsheet.

## UPDATE (2026-09-04, same day, second pass) — all 100 numbers now have evidence

New sources (TCDB, a second FootballCardShop batch, bundled marketplace/search corroboration for
#370-382, and named corroboration for #398-400) closed every remaining gap. **This section is the
current state; the "Original pass" section below is kept as history, not superseded/deleted.**

### A. Total unique #301-400 now sourced
**100 of 100.** Every card number has at least one piece of evidence — but "has evidence" is not
the same as "production-ready" (see N).

### B. Numbers still missing direct (named, non-bundled) evidence
**0** have zero evidence. However, **14 numbers rest on evidence weaker than a directly-named
single checklist source** (`SEARCH_SYNTHESIS_UNCONFIRMED`): #312, and #370-382 (13 numbers, the
bundled "marketplace/search" claim). These should not be treated as equivalent to the 85 numbers
backed by a specifically-named source.

### C. TWO_SOURCE_VERIFIED total
**28** — the 22 from the original pass (#301-310, #314-325) plus 5 newly confirmed by the
TCDB/FootballCardShop overlap (#332-334, #348-349) plus #400 (FootballCardShop + FreshDCards/Sports
Card Investor).

### D. ONE_SOURCE_VERIFIED total
**57** — every number covered by exactly one directly-named source and nothing else
(#311, #313, #326-331, #335-347 minus the TCDB/FCS overlaps already counted in C, #350-369,
#383-399 minus #400).

### E. INDEPENDENCE_UNCONFIRMED total
**0 as a standalone status this pass** — every multi-source case either reached
`TWO_SOURCE_VERIFIED` (with the same "positive but not airtight" independence caveat as before) or
stayed single-source. No case this pass looked mechanically identical the way 2024 Optic's TCDB
extraction did against Checklist Insider.

### F. SOURCE_CONFLICT total
**1** — #345 (Will Campbell).

### G. Exact conflicts
**#345 Will Campbell:** TCDB says team = "New England Patriots"; a FreshDCards article instead
says "LSU Tigers" (a college affiliation, not an NFL team). Not normalized away — both values
preserved in the evidence table, TCDB's shown as the display value (since "LSU Tigers" cannot
literally be a 2025 NFL card's team field), row kept out of any verified status.

### H. Status of #312
Still `SEARCH_SYNTHESIS_UNCONFIRMED`. New evidence this pass: Beckett's "Rated Rookies Autographs
Orange" parallel/autograph checklist also lists RJ Harvey/Denver Broncos at #312 — but that's a
different product tier reusing base numbering, not the Base Rated Rookie checklist itself. Per
explicit instruction, this does **not** promote #312 — recorded as a supporting note only.

### I. Status of #398
Upgraded to **`ONE_SOURCE_VERIFIED`** — FootballCardShop directly lists #398 JT Tuimoloau,
Indianapolis Colts. (Previously `SEARCH_SYNTHESIS_UNCONFIRMED` from a web-search-only result that
happened to agree.)

### J. Status of #399
Upgraded to **`ONE_SOURCE_VERIFIED`** — FootballCardShop directly lists #399 Xavier Watts, Atlanta
Falcons. Same upgrade reasoning as #398.

### K. Status of #400
**`TWO_SOURCE_VERIFIED`** — FootballCardShop directly lists Jaxson Dart, New York Giants; Sports
Card Investor and FreshDCards additionally corroborate the same claim per the user's message. Note
the caveat: unlike the formatting-divergence-based independence calls elsewhere in this audit,
FreshDCards'/Sports Card Investor's exact raw text wasn't supplied verbatim here, only the claim
itself — so this independence read is weaker evidence than the Beckett/FootballCardShop or
TCDB/FootballCardShop cases, even though it clears the two-source bar.

### L. Updated seven-player featured audit

| Player | Team | Base Rated Rookie # | Supporting sources | verificationStatus |
|---|---|---|---|---|
| Travis Hunter | Jacksonville Jaguars | **#301** | Checklist Insider + Beckett | `TWO_SOURCE_VERIFIED` |
| Ashton Jeanty | Las Vegas Raiders | **#305** | Checklist Insider + Beckett | `TWO_SOURCE_VERIFIED` |
| Matthew Golden | Green Bay Packers | **#311** | Beckett | `ONE_SOURCE_VERIFIED` |
| Tetairoa McMillan | Carolina Panthers | **#314** | Beckett + FootballCardShop | `TWO_SOURCE_VERIFIED` |
| Cam Ward | Tennessee Titans | **#350** | FootballCardShop | `ONE_SOURCE_VERIFIED` |
| Emeka Egbuka | Tampa Bay Buccaneers | **#375** | bundled marketplace/search only | `SEARCH_SYNTHESIS_UNCONFIRMED` |
| Jaxson Dart | New York Giants | **#400** | FootballCardShop + FreshDCards + Sports Card Investor | `TWO_SOURCE_VERIFIED` |

All seven now have a Base Rated Rookie number. Only 4 of 7 (Hunter, Jeanty, McMillan, Dart) are
`TWO_SOURCE_VERIFIED`; Golden and Ward are single-source; **Egbuka's #375 rests on the weakest
evidence tier in the whole table** and should not be treated the same as the other six.

### M. Do all 100 numbers now have at least one traceable source?
**Yes**, in the loose sense that every number has *some* evidence trail. **No**, in the sense that
14 of those 100 (#312, #370-382) trace only to bundled/unnamed or non-base evidence rather than a
specifically-named, individually-reviewable checklist page.

### N. Production activation recommendation
**Not yet — do not activate.** Reasons:
1. 14 of 100 numbers rest on the weakest evidence tier (`SEARCH_SYNTHESIS_UNCONFIRMED`), including
   one featured player (Emeka Egbuka).
2. 1 unresolved conflict (#345).
3. Every "independent" second-source judgment this pass (and the prior pass) is based on text the
   user relayed, not a page Claude actually opened side-by-side — `checklistinsider.com`,
   `beckett.com`, `footballcardshop.com`, `tcdb.com`, and `cardsmithsbreaks.com` are all
   `EGRESS_BLOCKED` this session. The formatting-divergence heuristic is a reasonable signal, not
   proof, and every prior pass in this whole 2024/2025 effort has treated a human spot-check of
   the live pages as a prerequisite before production wiring, not an optional nicety.
4. `chaseMap`/normalizer work for a 2025 Donruss product file hasn't been built at all yet (only
   the evidence-gathering stage is done) — there is no `data/football/2025/donruss.json` in the
   shape `CHECKLIST_MANIFEST` actually requires.
5. Per every prior instruction in this session, explicit user approval is required regardless of
   how complete the evidence looks.

---

## Original pass (kept as history)

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
