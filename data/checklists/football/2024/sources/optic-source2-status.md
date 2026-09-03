# 2024 Donruss Optic Rated Rookies #201-300 — Source 2 status

## Source 2: TCDB (Trading Card Database) — PARTIAL, 14 of 100 rows

`optic-tcdb-rated-rookies-201-300.csv` in this directory holds only the 14 rows
(#201-214) the user pasted directly into chat on 2026-09-03. Rows #215-300
are present as placeholder lines (`status=PENDING_EXTRACTION`, player/team
blank) so the file's shape matches the full 100-card block, but **no data has
been fabricated for them**. Do not run `optic-v2-source2-reconciliation.csv`
until the remaining 86 rows are supplied — a reconciliation against a
14/100-populated source would misrepresent 86 records as unverifiable rather
than simply not-yet-supplied.

## Supporting sources (structure-only, not per-card evidence)

Per explicit instruction, these establish that the *product structure* is
correct but are **not** counted as individual card-level verification for any
of the 100 records:

- **Beckett**: 2024 Donruss Optic Football base set = 300 cards; Rated
  Rookies = #201-300.
- **Checklist Center**: "2024 Donruss Optic Rated Rookies" is its own
  100-card subset beginning at #201 Caleb Williams.

These corroborate that `optic-rated-rookies-v2.json`'s scope (100 cards,
#201-300) is the right shape for the product, but confirm nothing about which
specific player sits at cards #215-300.

## What's needed to proceed

The remaining 86 rows (#215-300) of the TCDB extraction, in the same
`cardNumber,player,team` shape as #201-214 above. Once supplied, this file
will be completed (not a new file) and
`data/checklists/football/2024/optic-v2-source2-reconciliation.csv` will be
generated automatically per the specified MATCH/PLAYER_MISMATCH/
TEAM_MISMATCH/MISSING_SOURCE2/NEEDS_REVIEW rule, with no manual judgment
calls on any row.
