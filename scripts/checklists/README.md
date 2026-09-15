# Checklist ingestion pipeline

Real, tested ingestion tooling for turning an official manufacturer
checklist page into CardStorm's normalized checklist schema, with a
verification gate that decides RELEASED / PARTIAL / NOT_READY.

## Status as of the checklist-recovery-ingestion session (2026-09-15)

**Zero real products were ingested this session.** Official manufacturer
sites (topps.com, panini.com, paninisamerica.net) are unreachable from this
sandbox — the outbound HTTPS egress proxy returns `403` to a `CONNECT` for
those hosts, confirmed independently via both a raw `curl` and the
`WebFetch` tool (see the PR description for the exact evidence). No
checklist row in this repository was fabricated to work around that. The
pipeline below is real, working code, validated against clearly-labeled
test fixtures (`fixtures/*.html`, `scripts/test-checklist-ingestion.js`) —
not against real manufacturer pages, because none were reachable.

## Layout

- `registry.js` — single source of truth for `SPORTS`/`YEARS` (mirrors
  app.html's `SPORTS`/`YEARS` constant) and the candidate product source
  list a future ingestion run should target. Every candidate's `verified`
  field is `null` until a real fetch+parse of that exact URL succeeds.
- `schema.js` — the normalized checklist-row schema (`normalizeCard`) and
  per-product source metadata (`buildSourceMeta`). Only fields a source
  actually supports are populated; everything else stays `null`.
- `team-alias.js` — explicit team-name alias map (`normalizeTeam`), by
  design not fuzzy matching, so two distinct teams can never be merged.
- `player-name.js` — player-name formatting/normalization
  (`normalizePlayerName`), malformed-name detection
  (`malformedNameReason`), and an identity key (`playerIdentityKey`) that
  normalizes formatting without ever collapsing a player and their Jr./Sr.
  namesake into one identity.
- `normalize-checklist.js` — turns an array of raw parsed rows into
  normalized rows, excluding (and logging the reason for) any row that
  fails a structural check rather than silently dropping it.
- `validate-checklist.js` — the verification gate: duplicate card numbers,
  duplicate player/card-number combos, card-number gaps, malformed names,
  sport/year/product mismatches, missing source metadata, and (when an
  expected count is supplied) count sanity. Computes the final
  RELEASED/PARTIAL/NOT_READY status — a product is never marked RELEASED
  because a file merely exists.
- `fetch-source.js` — a real HTTPS (and, for local test fixtures only,
  HTTP-over-loopback) fetch with no mocking. Any transport failure
  (DNS, TLS, proxy rejection, timeout) surfaces as a clearly-typed
  `NetworkBlockedError`, never as an empty/placeholder success.
- `ingest-topps.js` / `ingest-panini.js` — source-specific HTML parsers
  (two different real-world markup shapes, an HTML `<table>` for Topps and
  repeated `checklist-row` divs for Panini) wired to fetch + normalize +
  validate end to end.
- `fixtures/*.html` — **test fixtures only, not real product data**, each
  file says so at the top. They mimic the structure a real checklist page
  would have (numbered rows, a rookie marker, an intentional duplicate card
  number and an intentional gap) so the parser/validator logic can be
  proven correct without a live fetch.

## What a future session with real network access should do

1. Confirm reachability the same way this session did (`curl`, then
   `WebFetch`, against an actual topps.com/panini.com checklist URL).
2. If reachable, update `registry.js`'s `PRODUCT_SOURCE_CANDIDATES` with the
   real URL(s) actually being ingested, run `ingestTopps`/`ingestPanini`
   against them, inspect `validation.errors`/`validation.warnings`, and only
   write a `data/<sport>/<year>/<product>.json` file (following the existing
   `donruss.json`/`prizm.json`/`select.json` shape) once `validation.status`
   is `RELEASED` or an intentionally-scoped `PARTIAL` (same pattern as
   `data/football/2025/donruss.json`'s Rated-Rookie-only partial coverage).
2. Add the new product to `CHECKLIST_MANIFEST` in app.html with the correct
   `status`, and Team Hunt / Product Intelligence pick it up automatically —
   see `checklistLibraryStatus()` in app.html, which already reads
   `CHECKLIST_MANIFEST` status honestly for both the checklist library and
   the Sets & Packs product tiles.
3. If a real page's markup doesn't match `parseToppsChecklistHtml` /
   `parseCheckListRowsHtml`'s assumed structure, adapt that one function —
   never add a fallback that guesses rows out of unstructured text.
