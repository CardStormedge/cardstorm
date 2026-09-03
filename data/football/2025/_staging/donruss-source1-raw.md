# 2025 Donruss — Source 1 raw ingestion lane (empty, awaiting real data)

No real 2025 Donruss checklist has been supplied or found yet. This file is a placeholder
documenting the expected raw shape so a real source, once supplied, can be dropped in and
normalized without inventing an ingestion format on the fly.

## Expected raw shape (mirrors `data/football/2024/donruss.json`, the proven pattern)

```json
{
 "product": {
  "sport": "Football",
  "year": 2025,
  "brand": "Panini",
  "set": "Donruss",
  "displayName": "2025 Panini Donruss Football",
  "releaseDate": "2025-09-17",
  "baseSetSize": null,
  "veteranLegendRange": null,
  "ratedRookieRange": null,
  "source": {
   "sourceURLs": ["<the real checklist source URL(s) supplied>"],
   "note": "<honest coverage note - what is and isn't enumerated>"
  }
 },
 "categories": {
  "Rated Rookies": {
   "kind": "cards",
   "cards": [
    {"cardNumber": 0, "player": "", "team": "", "rookie": true, "ratedRookie": true}
   ]
  }
 }
}
```

`kind: "cards"` (an enumerable card array) is what makes a category eligible for scanning at
all — exactly the same rule `normalizeDonruss2024`/`scanProductForPlayer` already enforce in
`app.html`. Anything else (`kind: "families"`, `"pending"`, `"subgroups"`) is a name-only list
and must never be treated as player-level evidence, per the existing 2024 rule.

## Accepted input formats for the real source

Any of the following, supplied directly (paste, file, or CSV), will be normalized into this
shape — you don't need to pre-format it as the JSON above:

- CSV: `cardNumber,player,team,rookie,setName` (or `category`) per row
- Plain numbered list: `301 Player Name — Team Name` (the format already used for the 2024 Optic
  Checklist Insider/TCDB batches)
- The manufacturer's own raw export, if you have one

## What happens once real data lands here

1. It gets normalized into `donruss-source1-normalized.json` (same directory) using the schema
   in `data/checklists/football/2025/donruss-proposed-manifest-entry.md`.
2. Every row gets `verificationStatus: "ONE_SOURCE_VERIFIED"` — never higher — until a second,
   genuinely independent source is reconciled against it (see
   `data/checklists/football/2025/donruss-source2-reconciliation.csv`).
3. Nothing here is wired into `CHECKLIST_MANIFEST` or any live scanner. See the production gate
   in `donruss-proposed-manifest-entry.md`.

No rows exist below this line — none are being invented to fill this file.
