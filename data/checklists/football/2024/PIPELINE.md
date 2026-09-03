# How the research/staging track feeds live CardStorm data

This folder (`data/checklists/football/2024/`) is a research/staging layer that predates and runs
parallel to the live scanning architecture in `app.html` (`CHECKLIST_MANIFEST`,
`scanProductForPlayer`, `data/football/2024/*.json`). As of this pass it is unified into one
pipeline instead of two independent systems:

```
RESEARCH / STAGING DATA
  data/checklists/football/2024/*.csv, *.json  (this folder — sourced, single-source-cited)
        ↓
VALIDATION / LAUNCH GATE
  data/checklists/football/2024/launch-audit.csv  (existing gate — PASS/PARTIAL/OPEN per row)
  + a second independent source required before any PARTIAL/OPEN row can pass
        ↓
NORMALIZED STAGING (schema-compatible, NOT live)
  data/football/<year>/_staging/<product>.json
  each carries a `verification` block: {status, recordCount, sourceCount, sources[], live:false, requiresForLive[]}
        ↓
NORMALIZED VERIFIED DATA
  data/football/<year>/<product>.json  (e.g. donruss.json, prizm.json, select.json)
  promoted from _staging/ only once sourceCount >= 2 (or another explicit sign-off) and the
  launch-audit.csv row for that product reads PASS
        ↓
CHECKLIST_MANIFEST (app.html)
  a manifest entry + chaseMap is added ONLY after the product's staging file is promoted
        ↓
LIVE CARDSTORM
  scanProductForPlayer() / verifiedChaseCardsHTML() present it to users as verified
```

## Current status of every 2024 product against this pipeline

| Product | Stage | Notes |
|---|---|---|
| Donruss | LIVE | Already in `CHECKLIST_MANIFEST`, rookie evidence only |
| Prizm | LIVE | Already in `CHECKLIST_MANIFEST`, rookie/caseHit/auto/numbered |
| Select | LIVE (base tiers only) | Rookie evidence only; XRC rows must never map to a chase type — see conflict below |
| Donruss Optic | STAGED, NOT LIVE | `data/football/2024/_staging/optic.json` — 125 records, 1 source, requires a second source before promotion |
| Mosaic | STAGED, NOT LIVE | `data/football/2024/_staging/mosaic.json` — 34 records (Stained Glass inserts only), 1 source, requires a second source before promotion |
| Absolute, Phoenix, Contenders, Topps Chrome, Origins, Clearly Donruss, Score, Prestige, Gold Standard, Certified, Black, Obsidian, Illusions | RESEARCH ONLY | A checklist *source* is documented in `coverage.csv`/`core-products.json`, but zero player-level rows exist anywhere in the repo. `coverage.csv`'s "Yes" columns mean a source was located, not that CardStorm has verified rows — do not treat as launch-ready. |

## Conflict found and fixed against live data

`select.json`'s `XRC` category (card #501-520) enumerates the **2025** draft class (Cam Ward,
Jaxson Dart, Shedeur Sanders, Travis Hunter, etc.) as 2024 Select redemption rows. The dormant
research (`select-rookie-validation-rules.json`, `cardstorm-2024-rules.json`) is explicit that
these must never surface as 2024 Team Hunt rookie targets. Before this pass,
`CHECKLIST_MANIFEST['football|2024'].select.chaseMap` mapped `'XRC':'rookie'`, which meant
switching Team Hunt to 2024 for a player like Jaxson Dart (on the New York Giants' current 2026
roster) would show a false "ROOKIE — Select · 1 verified card" claim sourced from his 2024 XRC
redemption row — a real, live violation of CardStorm's core accuracy rule. Fixed in this pass by
removing that mapping (see app.html `CHECKLIST_MANIFEST`) — XRC rows are no longer scanned into
any chase type. No other product (`donruss.json`, `prizm.json`) had this problem; the only 2025
draft-class name found in either was Marvin Harrison Jr., who is a legitimate 2024 rookie and is
correctly present.

## Reference-card CSV and dormant set-catalog files

`data/reference-cards/2024-football-reference-map.csv` remains RESEARCH_ONLY (hotlinked eBay
images, per `team-hunt-source-registry.csv`) — not promoted, not localized, not live.
`data/set-catalog.js` / `data/set-ui-patch.js` are addressed separately: their football coverage
has been extracted into `data/products/football/2024.json` / `2025.json`; the files themselves are
kept as-is (not deleted) because they still hold the only released-vs-announced source data for
baseball/basketball/Pokémon, which have not yet been given their own product registries.
