# Proposed 2025 football CHECKLIST_MANIFEST entry format (template only — not wired in)

Not added to `app.html`. This shows the shape a real entry would take once a product actually has
verified data, using the same generic scanner (`scanProductForPlayer`/`extractProductSources`)
built for 2024.

```js
// EXAMPLE ONLY - do not copy into CHECKLIST_MANIFEST until a real
// data/football/2025/<product>.json exists and passes the gate below.
{
 key: 'donruss',
 name: 'Donruss',
 file: 'data/football/2025/donruss.json',
 teamMapped: true,
 status: 'RELEASED',
 normalizer: 'donruss',           // reuse normalizeDonruss() - 2025 Donruss's raw
                                   // shape should match 2024's if Panini kept the
                                   // same export format; verify before assuming
 verificationStatus: 'NOT_READY', // see status vocabulary below
 chaseMap: {}                      // populate only per-category once verified;
                                   // empty until then, never guessed
}
```

## Verification status vocabulary (extends the existing NOT_READY/PARTIAL/PASS labels used for 2024 Optic)

| Status | Meaning |
|---|---|
| `NOT_READY` | No usable source data ingested yet — current state of all 5 tracked 2025 products |
| `ONE_SOURCE_VERIFIED` | A single source's card-number/player/team mapping has been captured and looks internally consistent, but has no second, genuinely independent confirmation |
| `SECOND_SOURCE_PENDING` | A first source exists; actively looking for a second one to reconcile against |
| `INDEPENDENCE_UNCONFIRMED` | A second-looking source was obtained, but it could not be established as genuinely separate from the first (e.g. identical row-for-row content/formatting — the exact TCDB-vs-Checklist-Insider situation found and corrected during the 2024 Optic work) — **does not count toward two-source verification** |
| `TWO_SOURCE_VERIFIED` | Two genuinely independent sources agree on the exact card-number/player/team identity for that record |
| `SOURCE_CONFLICT` | Two sources disagree on player or team for the same card number — flagged for manual review, neither source's value is used until resolved |
| `SOURCE_CONFLICT` also covers a >1-source situation where sources agree on player but not team, or vice versa — do not silently pick one |

This mirrors (and slightly extends) the process already used for 2024 Optic
(`data/football/2024/_staging/optic-rated-rookies-v2.json`'s `VERIFIED_TWO_SOURCE`/
`VERIFIED_ONE_SOURCE` fields, and the `BECKETT_INDEPENDENTLY_VERIFIED`/
`TCDB_MECHANICAL_MATCH_INDEPENDENCE_UNCONFIRMED` distinction added after the TCDB lesson).

## Card-number-first reconciliation rule

When a second source becomes available, match rows by **card number first**, then compare player,
then team. A player-name or team disagreement on the same card number is a `SOURCE_CONFLICT` row —
neither source's data is used for that record until a human resolves it. This exact process (not
"whichever source looks more complete") is what the 2024 Optic v1→v2 and v2→Beckett reconciliations
used, and is not being changed here.

## Gate before any 2025 product enters CHECKLIST_MANIFEST for real

1. A real `data/football/2025/<product>.json` file exists, normalized to the same shape
   `normalizeDonruss`/`normalizePrizm`/`normalizeSelect` already expect (or a new normalizer is
   written and tested the same way).
2. At minimum the Rookie category reaches `TWO_SOURCE_VERIFIED` for a meaningful share of its
   records (not just a handful of spot-checked rows — see the 2024 Optic lesson about a 16-of-125
   sample not being enough to call a whole block ready).
3. `chaseMap` only lists categories that are actually record-backed (`kind:'cards'`/Array shape),
   exactly like the existing 2024 rule that skips family-only Select categories.
4. Explicit user approval, same as every 2024 product promotion this session.

Until all four are true, Team Hunt's existing `verifiedChaseCardsHTML()` behavior for football 2025
is correct as-is: it already renders "official checklists have not yet been verified by CardStorm
for football" with a link back to the 2024 verified data, because no `'football|2025'` manifest key
exists. **No code change is needed to keep this honest — the current architecture already does the
right thing by omission.**
