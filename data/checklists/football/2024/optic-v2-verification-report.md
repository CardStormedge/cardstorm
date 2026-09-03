# 2024 Donruss Optic Rated Rookies #201-300 — v2 Verification Report

Source1 for all 100 records: **Checklist Insider** (full extraction supplied directly by the user on 2026-09-03).

Source2 attempts used domain-restricted web search (`beckett.com` only) to find genuinely independent
per-card confirmation - not the #201-300 Rated Rookie *range* statement Beckett makes generally (which
is not, by itself, proof of any individual card's identity per the user's explicit instruction), but a
specific card-number/player match drawn from Beckett's own product/checklist pages.

## Summary

| verificationStatus | Count |
|---|---|
| VERIFIED_TWO_SOURCE | 4 |
| VERIFIED_ONE_SOURCE | 91 |
| NEEDS_REVIEW | 5 |
| CONFLICT | 0 |
| **Total** | **100** |

## VERIFIED_TWO_SOURCE detail (4 records)

- **#201 Caleb Williams (Chicago Bears)** — Beckett product catalog pages for 2024 Donruss Optic Green Velocity #201 Caleb Williams RR and Purple Shock #201 Caleb Williams RR (parallels of base card #201) - domain-restricted beckett.com search, distinct from Checklist Insider.
- **#276 Marvin Harrison Jr. (Arizona Cardinals)** — Beckett-domain search (beckett.com) independently returned card #276 = Marvin Harrison Jr., Arizona Cardinals, sourced from Beckett's own 2024 Donruss Optic checklist/team-set content, not Checklist Insider.
- **#277 Max Melton (Arizona Cardinals)** — Beckett-domain search independently returned card #277 = Max Melton, Arizona Cardinals (including a /60 parallel print run detail), sourced from Beckett's own checklist content.
- **#292 Tip Reiman (Arizona Cardinals)** — Beckett-domain search independently returned card #292 = Tip Reiman, Arizona Cardinals, sourced from Beckett's own checklist content across multiple Optic parallel pages.

## NEEDS_REVIEW detail (5 records - second source attempted, no clean confirmation)

- **#220 Chris Braswell (Tampa Bay Buccaneers)** — Beckett-domain search attempted, no clean/unambiguous per-card confirmation returned (one query for #300 returned a conflicting answer citing a different card number for the same player - treated as inconclusive, not confirming).
- **#229 Drake Maye (New England Patriots)** — Beckett-domain search attempted, no clean/unambiguous per-card confirmation returned (one query for #300 returned a conflicting answer citing a different card number for the same player - treated as inconclusive, not confirming).
- **#248 Jayden Daniels (Washington Commanders)** — Beckett-domain search attempted, no clean/unambiguous per-card confirmation returned (one query for #300 returned a conflicting answer citing a different card number for the same player - treated as inconclusive, not confirming).
- **#293 Trey Benson (Arizona Cardinals)** — Beckett-domain search attempted, no clean/unambiguous per-card confirmation returned (one query for #300 returned a conflicting answer citing a different card number for the same player - treated as inconclusive, not confirming).
- **#300 Xavier Worthy (Kansas City Chiefs)** — Beckett-domain search attempted, no clean/unambiguous per-card confirmation returned (one query for #300 returned a conflicting answer citing a different card number for the same player - treated as inconclusive, not confirming).

## Remaining VERIFIED_ONE_SOURCE (91 records)

No second-source attempt made this pass. Full per-record listing is in
`optic-v2-verification-report.csv` (all 100 rows). Only Checklist Insider backs these.

## Bottom line

Only 4 of 100 records are genuinely two-source verified. The gate stays **NOT_READY**. Optic is not
added to `CHECKLIST_MANIFEST`. See `data/football/2024/_staging/optic-rated-rookies-v2.json` for the
full per-record data and `optic-v1-v2-diff.csv` for the comparison against the superseded v1 mapping.
