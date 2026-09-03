# 2025 Donruss ingestion & reconciliation pipeline (prepared, not wired in)

Nothing in this file is live. `CHECKLIST_MANIFEST` has no `'football|2025'` key, and this document
does not add one. It defines the exact process so a real supplied source can move through it
without inventing rules mid-stream.

## 1. Identity key

Primary key: **`<product>|<setName-or-subset>|<cardNumber>`** — e.g. `donruss25|Rated Rookies|301`.

- Card number + product + subset only. **Player is deliberately excluded from the key.** Two rows
  sharing the same identity key is a genuine data problem (duplicate/conflicting source row), not
  something to be resolved by treating different players as different records.
- Subset/`setName` is included specifically because Donruss (like 2024) can reuse card numbers
  across different subsets (e.g. a base-set number vs. an insert numbered independently) — the
  2024 `donrussCardKey()` already includes category for this reason, and this preserves that.
- This differs slightly from 2024's existing key (which also folds in player, `'donruss24|'+cat+'|'+cardNumber+'|'+player`) — deliberately, per this task's explicit instruction. Noting the
  discrepancy here rather than silently diverging from precedent without explanation.

## 2. Normalized record schema

See `data/football/2025/_staging/donruss-source1-normalized.json`'s `_fields` block for the full
field list: `identityKey`, `product`, `year`, `sport`, `setName`/`category`, `cardNumber`,
`player`, `team`, `rookie`, `source1`, `source2`, `verificationStatus`, `rawRecord` (the original
row preserved verbatim for audit).

## 3. Per-record verification status vocabulary

| Status | Meaning |
|---|---|
| `NOT_READY` | Default / no source data yet |
| `ONE_SOURCE_VERIFIED` | Came from a real supplied source1 row (player + card number + source attribution all present) — **does not count as production verification** |
| `SECOND_SOURCE_PENDING` | Has source1, actively looking for source2 |
| `TWO_SOURCE_VERIFIED` | source2 independently confirms source1's exact card-number/player/team identity |
| `SOURCE_CONFLICT` | source1 and source2 disagree on player or team for the same identity key — flagged for manual review, neither value used until resolved |
| `INDEPENDENCE_UNCONFIRMED` | A candidate source2 could not be established as genuinely separate from source1 (see safeguard below) — treated the same as one-source for gate purposes |

## 4. Reconciliation matching order and outcomes

When a source2 candidate is supplied, match against normalized source1 rows in this order:
**(1) set/subset when the same card number appears in more than one subset, (2) card number,
(3) player, (4) team.** Outcome per row, written to
`data/checklists/football/2025/donruss-source2-reconciliation.csv`:

| status | meaning |
|---|---|
| `MATCH` | Same identity key, same player, same team in both sources → row becomes `TWO_SOURCE_VERIFIED` |
| `PLAYER_MISMATCH` | Same identity key, different player → `SOURCE_CONFLICT`, not overwritten |
| `TEAM_MISMATCH` | Same identity key, same player, different team → `SOURCE_CONFLICT`, not overwritten |
| `MISSING_SOURCE2` | source1 row has no corresponding source2 row → stays `ONE_SOURCE_VERIFIED`/`SECOND_SOURCE_PENDING` |
| `SOURCE_AMBIGUOUS` | source2 has more than one plausible match for the same identity key (e.g. inconsistent subset labeling) → flagged, not auto-resolved |
| `INDEPENDENCE_UNCONFIRMED` | See safeguard below |

Never overwrite either source's value on a mismatch — the reconciliation file records the
disagreement; a human resolves it.

## 5. Independence safeguard (the 2024 Optic/TCDB lesson, made explicit)

Before any reconciliation counts toward `TWO_SOURCE_VERIFIED`, source2 must be checked against
source1 for **mechanical identity**, not just factual agreement:

- Same row count, same row order, same exact formatting quirks (capitalization, punctuation,
  abbreviation style) as source1 → treat as `INDEPENDENCE_UNCONFIRMED`, document why, and do
  **not** count it as a second source no matter how many rows "match."
- This is exactly what happened during 2024 Optic verification: a supplied "TCDB" extraction
  turned out to be byte-for-byte identical to the Checklist Insider extraction already used as
  source1. It was downgraded from `TWO_SOURCE_VERIFIED` back to
  `TCDB_MECHANICAL_MATCH_INDEPENDENCE_UNCONFIRMED` once discovered — the same corrective applies
  here before it ever gets marked verified in the first place.
- A genuinely independent source2 is expected to show at least some natural variance versus
  source1 (different row order, minor formatting differences, maybe different subset naming) even
  when the underlying facts agree — because it came from a different original extraction, not a
  copy of the same one.

## 6. Rookie extraction

Once real source1 data lands, rookie rows are whatever the source itself marks `rookie`/`ratedRookie` (or
equivalent) — never a handpicked list. The 7 currently-featured names (Cam Ward, Travis Hunter,
Ashton Jeanty, Tetairoa McMillan, Emeka Egbuka, Jaxson Dart, Matthew Golden) will appear in the
featured-rookie report below only if and because the real source contains them — nothing is
pre-seeded for them.

## 7. Featured-rookie report format (generator ready, no data yet to run it on)

For each of the 7 names, once source1 exists:

```
player | team | Donruss records found | card numbers | rookie designation | source1 status | source2 status | final verificationStatus
```

`data/checklists/football/2025/validate_donruss_staging.py` (added this pass, see below) prints
exactly this table via `python3 validate_donruss_staging.py --featured-rookies` once
`donruss-source1-normalized.json` has real records.

## 8. Production gate (unchanged from the general 2025 gate, restated for Donruss specifically)

`football|2025`'s Donruss entry is added to `CHECKLIST_MANIFEST` only when:
1. Real source1 data is normalized here.
2. A genuinely independent source2 (passing the safeguard above) reconciles a meaningful share of
   rookie rows to `TWO_SOURCE_VERIFIED` — not a small spot-check sample (see the 2024 Optic
   16-of-125 lesson: too small a sample isn't sufficient to call a whole block ready).
3. `chaseMap` lists only the actually record-backed (`kind:'cards'`) categories.
4. Explicit user approval.

## 9. Source label rule

`extractProductSources()` (already in `app.html`) reads source names/URLs directly from
`raw.product.source.sourceURLs` (or `raw.sources`) — it never hardcodes "Donruss checklist",
"TCDB", or "Beckett" as a string. This is already how 2024 Donruss/Prizm/Select work, and the
2025 raw shape (`donruss-source1-raw.md`) is deliberately shaped to feed the same field, so no new
hardcoding is needed once this goes live.

## Exact input formats accepted next

Any of: a CSV (`cardNumber,player,team,rookie,setName`), a plain numbered list
(`301 Player Name — Team Name`, the same format already used for 2024 Optic), or a raw JSON
export in the shape shown in `donruss-source1-raw.md`. Paste it, attach a file, or point at
one — whatever's easiest.
