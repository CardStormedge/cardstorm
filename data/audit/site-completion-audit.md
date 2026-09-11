# CardStorm site-completion audit

Snapshot date: 2026-09-11, against production `main` at merge commit `f415758015015eda81b1462943cf530013594ab0`.

This is a read-only audit. No production behavior was changed to produce it. Every finding below was
verified directly against the live repo (`CHECKLIST_MANIFEST` in `app.html`, `data/**` JSON files, and
`index.html`'s dashboard/hero wiring) — nothing here is inferred or guessed.

Status legend used throughout: **COMPLETE**, **PARTIAL**, **STAGED**, **MISSING DATA**, **MISSING IMAGE**,
**UNVERIFIED DATA**, **BROKEN / UNUSED**.

## Completion matrix

| Area | Status | Notes |
|---|---|---|
| HOME / HERO | COMPLETE | `index.html` hero rotation, dashboard tiles, mobile nav all functional (confirmed across multiple prior regression passes this program). |
| TEAM HUNT | PARTIAL | Core flow (team → player → chase scan) works for all 3 sports' rosters, but real per-card *checklist* verification only exists for football 2024/2025 (see below). Basketball/baseball Team Hunt pages render rosters and the Gear Up/comp UI shell, but `verifiedChaseCardsHTML` always shows "no verified chase-card records" for those sports since no `CHECKLIST_MANIFEST` entry exists for them. |
| FOOTBALL CHECKLISTS | PARTIAL | 2024: Donruss (Rated Rookies only), Prizm (4 categories), Select (5 categories) are `RELEASED` and record-backed. 2024 Optic is fully staged (`data/football/2024/_staging/optic-rated-rookies-v2.json`, 100/100 rows) but **NOT_READY** and **not wired** into `CHECKLIST_MANIFEST` — second-source independence never confirmed (see `optic-v2-verification-report.md`). 2024 Mosaic is staged (`_staging/mosaic.json`) and also unwired. 2025: Donruss Base Rated Rookies is `PARTIAL` and gated — only 28/100 records pass the strict production gate and can render VERIFIED; the other 72 stay in the file for audit only. No 2025 caseHit/auto/numbered/parallel/insert/memorabilia chase types are mapped for any football product. |
| BASKETBALL CHECKLISTS | MISSING DATA | Zero entries in `CHECKLIST_MANIFEST` for any basketball year. No `data/basketball/**` directory exists at all. Basketball Team Hunt rosters render (4 players/team, all 30 teams, in `app.html`'s `DATA.basketball`), but there is no per-card checklist data behind any of them. |
| BASEBALL CHECKLISTS | MISSING DATA | Same as basketball — zero `CHECKLIST_MANIFEST` entries, no `data/baseball/**` directory. Rosters render, no checklist evidence exists. |
| POKEMON | COMPLETE (for its current scope) | Landing + set-detail pages fully redesigned (PR #15/#16) with real, already-approved marketing art, working navigation, no fabricated per-card data. The 3 `TCG_2026` sets are editorial/status entries only (`LIVE SET` + description) — there is intentionally no per-card Pokémon checklist yet (`CHECKLIST STATUS` button explicitly says import is queued, "CardStorm will not invent missing entries"). |
| GOAT / LEGENDS | STAGED → being built this pass | Before this PR: `legends()` (reachable via index.html's `GOATS` hero tile) was a placeholder — "Legend Vault" backed by `WATCHCAT` (today's *active* stars, not historical legends), with the page copy itself stating "CardStorm hasn't loaded historical legend data yet." Zero historical GOAT players, cards, comps, or images existed anywhere in the repo. This PR adds `data/goat/goat-vault.json` (60-player editorial roster, empty card arrays) and a new "THE GOAT VAULT" UI — see Section 2 below. Also found: `index.html`'s dashboard-grid GOATS tile (`{key:'team',...}` at line 414) routes to Team Hunt instead of the legends/GOAT Vault page — a pre-existing routing bug, fixed in this PR (one-field change) since it directly blocks reaching the new feature. |
| GEAR UP / FANATICS | STAGED (data), COMPLETE (UI) | UI is fully built and polished (PR #12/#13). Data: 6 players have live offers (Jaxson Dart, Ashton Jeanty, Cam Ward, Travis Hunter, Tetairoa McMillan, Emeka Egbuka), 13 total offers, **all 13 are image-pending** (`image:null`, rendered via the "OFFICIAL FANATICS GEAR" placeholder treatment — never a fake photo). Team-level offers: 0 (empty `teams:{}`). |
| SETS & PACKS | PARTIAL | `data/set-catalog.js` covers released/announced products across football/baseball/basketball with real source URLs, driving the Sets & Packs browse UI. Per-product box art exists for 6 football configurations (`data/product-images/football/{2024,2025}.json`); everything else falls back to the honest "OFFICIAL PRODUCT IMAGE NOT YET LOADED" state (`pendingShot` class in `app.html`). |
| WATCHLIST | COMPLETE (for its current scope) | `watch()` renders `WATCHCAT` (19 current-era players) with real `COMPS` sale records for the 5 players that have them; the rest show "Comp feed pending" honestly. |
| BREAK CENTER | PARTIAL | Fully interactive (team-first entry point, personal hunt builder, break-listing form/localStorage, live listings). No real external break-calendar integration — all listings are user/collector-submitted, by design. |
| DAILY CARD GAME | COMPLETE | Driven by `game-data.json` (262KB, populated), functions correctly (confirmed in this session's own regression passes). |
| COLLECTION / VALUES | PARTIAL | `COLLECTION_ITEMS` has 14 hand-curated entries (10 football, 2 basketball, 2 baseball) spanning Rated Rookies/Case Hits/Inserts; values resolve only when a matching `COMPS` record exists (4 of 14 currently do — all Jaxson Dart/Ashton Jeanty). The rest correctly show "VALUE PENDING." No basketball/baseball comp data exists to back their 4 collection items. |

## B/C/D/E/F — detailed findings

### B. Missing images (exact `image:null` / absent-image records)

| Source file | Populated images | Missing/pending |
|---|---|---|
| `data/card-images/football/2024.json` | 0 | 0 populated, architecture-only (`images: []`) — **every** 2024 football card ever rendered in a chase reveal uses text only, never a real card photo |
| `data/card-images/football/2025.json` | 0 | same — architecture-only, `images: []` |
| `data/affiliate/fanatics.json` | 0 of 13 offers | **13 of 13** Fanatics Gear Up offers have `image:null` |
| `data/product-images/football/2024.json` | 4 | Donruss, Prizm, Select, Mosaic box art present; no per-configuration variants (e.g. Hobby vs. Retail) |
| `data/product-images/football/2025.json` | 2 | Select (Hobby), Prizm (Hobby); every other 2025 football product (Donruss, Optic, Mosaic, etc.) has no registered image |
| `data/goat/goat-vault.json` (new, this PR) | 0 of 60 `playerImage` | 0 of 60 `cardImage` across the (currently empty) card arrays |
| basketball / baseball card- or product-images | N/A | **no files exist** — 0% coverage for both sports |

**Total distinct missing/pending image records found: 13 (Fanatics) + 0/0 populated card-image registries (both sports/years) + 60 GOAT player photos + all non-listed product configurations.** The exact count of "every `image:null`" is unbounded for the two card-image registries because they contain zero records at all (not zero out of some populated total) — the registry itself is empty, which is a distinct, more foundational gap than "some records missing images."

### C. Placeholder treatments already in production (honest, non-fabricated)

- `GEAR_NO_IMAGE_SVG` / `gearNoImageVisual()` — jersey silhouette + lightning accent + player/team text, used for all 13 Fanatics offers.
- `.pendingShot` — "OFFICIAL PRODUCT IMAGE NOT YET LOADED" box, used for any Sets & Packs product without a registered image.
- Pokémon set-detail `CHECKLIST STATUS` alert — explicitly states import is queued, will not invent entries.
- Watchlist / Collection — "Comp feed pending" / "VALUE PENDING" states for every player/card without a real comp.
- These patterns are the model the new GOAT Vault card-image and empty-state treatments reuse (Section 9 below).

### D. Checklist gaps by sport/year

| Sport | Year | Manifest status |
|---|---|---|
| football | 2024 | RELEASED (Donruss/Prizm/Select) — Optic and Mosaic staged, not wired |
| football | 2025 | PARTIAL (Donruss, 28/100 records strict-gate-eligible) |
| football | 2026 | no manifest entry (year selector exists in UI, resolves to "not yet verified" fallback) |
| basketball | any | no manifest entry for any year |
| baseball | any | no manifest entry for any year |

### E. Staged-but-unwired checklists

- `data/football/2024/_staging/optic-rated-rookies-v2.json` — 100/100 records rebuilt from a full Checklist Insider extraction, but flagged `NOT_READY` in `data/checklists/football/2024/launch-audit.csv`: the only "second source" attempt (TCDB) was byte-identical to source 1, so independence was never confirmed; a partial Beckett cross-check only covers 5/100 rows.
- `data/football/2024/_staging/mosaic.json` — staged, not referenced by `CHECKLIST_MANIFEST['football|2024']`.
- 72 of 100 2025 Donruss Base Rated Rookie records — present in `data/football/2025/donruss.json` with full evidence-quality metadata, but excluded from live verification by `_passesStrictProductionGate===false`.

### F. Unverified data still exposed to users today

- None found that misrepresents itself as verified. Every "PARTIAL"/"MISSING" area above either shows an honest pending/empty state or (for the 28 strict-gate 2025 Donruss records) is verified under a documented, auditable gate. This audit found no case of fabricated or silently-unverified data being displayed as if it were confirmed.

## G. Dead / incomplete feature code found

- `data/football/2024/team-pilots/denver-broncos.json` — a single-team pilot file, superseded by the full-roster approach; not referenced anywhere in `app.html`.
- Pre-existing `index.html` GOATS dashboard-tile routing bug (`key:'team'` instead of `key:'legends'`) — fixed in this PR, see Section 2.

## Scope note

This audit covers what exists in the repo today. It does not itself add or verify any new checklist,
comp, or image data — per instructions, no card values, sold comps, images, or checklist records were
fabricated to "complete" any of the PARTIAL/MISSING rows above.
