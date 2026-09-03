# 2025 Football Checklist Data — Audit (2026-09-04)

## Bottom line

**Zero player-level 2025 football checklist records exist anywhere in this repository.** Not one
card number, not one confirmed rookie-to-card mapping. Everything found below is either release
metadata (real, but not card-level), or curated/unverified text explicitly labeled as such
elsewhere in the codebase. This is a materially different starting point than 2024 Optic, which at
least had a full (if flawed) 125-row extraction to reconcile — for 2025 there is nothing to
reconcile yet.

## Every 2025 football-related structure found, and what it actually is

| Location | Contains | Category |
|---|---|---|
| `data/football/2025/README.md` | A placeholder statement that no data exists yet | — (empty by design) |
| `data/products/football/2025.json` | 25 products (Score, Donruss, Donruss Optic, Prizm, Select, Topps Chrome, etc.) with `releaseStatus`/`releaseDate`/`source` (Beckett URL). Every entry's `checklistDataStatus` is explicitly `"no_data"`. | **A** for product existence/release facts only. **Not** player-level. |
| `data/card-images/football/2025.json` | Schema only, `images: []` | — (empty) |
| `data/product-images/football/2025.json` | 2 sealed-product image records (Select Hobby, Prizm Hobby) — box photography, not card data | Unrelated to checklist verification |
| `app.html` `REALPROD['football|2025']` | Box-art image paths for Select/Prizm (product photography) | Unrelated to checklist verification |
| `app.html` `HIT_LIBRARY_V83`, 2025 entries (lines ~484-494) | Curated insert/parallel *name* lists per product (e.g. "Chrome RC", "Refractor", "Rated Rookie Holo") with **no player, no card number, no team** | **B** — family-level only. Already correctly labeled in-app: "General chase families by product — not yet cross-checked against verified checklists." |
| `app.html` `COLLECTION_ITEMS`, 2025 entries (lines 300-305) | A curated personal-collection want-list (Jaxson Dart "Case Hit — Absolute Kaboom! Horizontal #34", Ashton Jeanty "Case Hit — Phoenix Color Blast #13", etc.) | **C** — hand-authored, for the separate "My Collection"/Checklists tracker feature (unrelated to Team Hunt chase verification, not touched this pass). These *do* have specific card names because they were built from the same 5 real PSA-cert-backed sales already in `COMPS` (verified earlier this session) — but they're presented as personal want-list items, not as a checklist source, and have no card number/team fields. **Do not treat as Team Hunt evidence.** |
| CHECKLIST_MANIFEST in `app.html` | No `'football\|2025'` key exists at all | — (confirmed via grep) |
| `data/checklists/football/2025/` | Did not exist before this pass | — (created this pass, see below) |

No dormant CSV, no staged JSON, no research-track equivalent to what existed for 2024 Optic
(`optic-chase-manifest.csv` etc.) — 2025 football has nothing like that anywhere in this repo.

## A. Real per-card records found
**None.** Zero files anywhere contain a 2025 football card number tied to a player and product.

## B. Family/product-level lists only
`HIT_LIBRARY_V83`'s 2025 entries (insert/parallel names per product, no player/card-number
attachment) and `data/products/football/2025.json` (release-date/manufacturer facts, explicitly
`checklistDataStatus: "no_data"`).

## C. Hand-authored/curated data
`COLLECTION_ITEMS`'s 2025 entries — a personal want-list feature, built from the 5 real comps
already in `COMPS`, not a checklist source.

## D. Unsupported references
None found beyond the above — no dangling file paths, no broken imports referencing 2025 football
checklist data that doesn't exist.

## Product-by-product report

| Product | Source | Total records | Rookie records | Player-level? | Card numbers? | Team data? | Chase category data? | Verification status | Production-ready? |
|---|---|---|---|---|---|---|---|---|---|
| 2025 Donruss | `data/products/football/2025.json` release metadata only | 0 | 0 | No | No | No | No (family names only, in HIT_LIBRARY_V83) | NOT_READY | NO |
| 2025 Donruss Optic | same | 0 | 0 | No | No | No | No | NOT_READY | NO |
| 2025 Prizm | same | 0 | 0 | No | No | No | No | NOT_READY | NO |
| 2025 Select | same | 0 | 0 | No | No | No | No | NOT_READY | NO |
| 2025 Topps Chrome | same | 0 | 0 | No | No | No | No | NOT_READY | NO |

Every product is at the same starting point: zero card-level data. None is closer than any other.

## What this pass adds (staging structure only, no fabricated records)

- `data/football/2025/_staging/` — created, empty, ready to receive a real card-level extraction in
  the same pattern proven for `data/football/2024/_staging/optic-rated-rookies-v2.json`.
- `data/checklists/football/2025/` — created, holding this audit and (see below) genuine,
  non-fabricated product-release facts already gathered via WebSearch earlier this session
  (release dates independently corroborated across Beckett/CardboardConnection/ChecklistInsider),
  mirroring the *structure* of `data/checklists/football/2024/core-products.json` without
  inventing any card-level content.
- A proposed (not wired) 2025 manifest-entry template — see
  `data/checklists/football/2025/proposed-manifest-template.md`.
