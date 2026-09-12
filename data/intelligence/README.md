# data/intelligence/ — intentional, temporary duplication

`comps.json` and `watchcat.json` in this directory are a **verbatim, byte-identical
copy** of the `COMPS` and `WATCHCAT` constants hardcoded inline in `app.html`.

## Why this duplication exists (and why it's not a bug)

CardStorm's frontend is a zero-build static site (GitHub Pages deploys the raw
repo files as-is — see `.github/workflows/pages.yml`). `app.html` reads
`COMPS`/`WATCHCAT` **synchronously**, at first script execution — for example
the homepage's MARKET RADAR tile renders `COMPS[0]` on the very first paint,
before a user interacts with anything. Switching that to an async `fetch()` of
a JSON file was evaluated and rejected: it risks an empty/broken first render
across multiple pages (homepage, Watchlist, Market Radar, Team Hunt, Ask
CardStorm) for the sake of removing a duplication that can instead be guarded
mechanically.

The `/api/cardstorm` serverless backend (see `api/lib/cardstormData.js`) has no
other way to read `COMPS`/`WATCHCAT` — they aren't reachable from a Node
process because they only exist as JS literals inside `app.html`. So this
directory exists to give the backend the same verified data, without touching
the frontend's synchronous rendering path at all.

**This is a deliberate, temporary tradeoff — not the intended long-term
architecture.**

## The guarantee: the two copies cannot silently drift

Two scripts exist specifically to make this safe:

- `scripts/check-comps-sync.js` — parses `app.html`'s inline `COMPS`/`WATCHCAT`
  arrays and diffs them against `data/intelligence/comps.json` /
  `watchcat.json`. **Exits non-zero (fails) the instant the two copies stop
  matching exactly** — a typo, a missed edit on one side, anything.
- `scripts/test-comps-parity.js` — proves, at the API level, that
  `cardstormData.lookup()` (what the backend actually uses) returns the exact
  same comp records for a known player (Travis Hunter) that the frontend's
  `COMPS` constant has. Not just "the files match" — "the code paths agree."

Both run via `npm test` (see `package.json`) and in CI on every pull request
that touches `app.html` or `data/intelligence/**` (see
`.github/workflows/comps-parity-check.yml`), so a PR that edits one copy
without the other **fails its checks** rather than silently shipping drift.

## Rule for future edits

If you ever add, remove, or change a record in `COMPS` or `WATCHCAT` inside
`app.html`, you **must** make the identical change in
`data/intelligence/comps.json` / `watchcat.json` in the same commit, then run:

```
npm test
```

to confirm both copies (and the code paths that read them) still agree.

## Long-term direction (not being done now)

Once CardStorm moves to a proper build pipeline — or the frontend can safely
consume generated/fetched data without harming first-paint behavior (e.g. a
build step that inlines `data/intelligence/*.json` into `app.html` at publish
time, rather than a runtime fetch) — `data/intelligence/*.json` should become
the **single source of truth**, with `app.html`'s inline constants generated
from it instead of hand-maintained in parallel. That refactor is intentionally
out of scope for this stage.

---

Preview deployment trigger after CardStorm Vercel project connection.
