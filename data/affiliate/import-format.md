# Fanatics offer import format

Hand Claude a CSV or JSON file in this shape and it can be ingested straight
into `data/affiliate/fanatics.json` without touching `app.html` or any
player-page HTML — the Gear Up module reads the data file at runtime.

## CSV columns (one row per offer)

```
player,team,product_title,product_type,fanatics_url,image_url,price,sale_price,collection,source,last_verified
```

- `player` — leave blank for a team-level offer (e.g. general team gear, not
  tied to one player). Must match the player's exact CardStorm display name
  (as shown on their Team Hunt roster card) when supplied, so it resolves to
  the right `playerOfferId`.
- `team` — team full name (e.g. "Chicago Bears") or abbreviation (e.g.
  "CHI") — either works, both are normalized on import.
- `product_title` — e.g. "Caleb Williams Chicago Bears Nike Rookie
  Collection Game Jersey"
- `product_type` — e.g. "Rookie Jersey", "Alternate Jersey", "T-Shirt",
  "Hat", "Autographed Memorabilia"
- `fanatics_url` — the exact product page URL. Used as-is, never rewritten.
- `image_url` — a product image URL, or a path to a local asset you also
  supply
- `price` / `sale_price` — as strings, e.g. `$129.99` (`sale_price` optional)
- `collection` — optional, e.g. "ROOKIE COLLECTION" — shown as a small
  label above the product title
- `source` — where this came from, e.g. "Fanatics official product page"
- `last_verified` — `YYYY-MM-DD`

## Equivalent JSON shape (also acceptable)

```json
[
  {
    "player": "Caleb Williams",
    "team": "Chicago Bears",
    "product_title": "Caleb Williams Chicago Bears Nike Rookie Collection Game Jersey",
    "product_type": "Rookie Jersey",
    "fanatics_url": "https://www.fanatics.com/...",
    "image_url": "https://...",
    "price": "$129.99",
    "sale_price": null,
    "collection": "ROOKIE COLLECTION",
    "source": "Fanatics official product page",
    "last_verified": "2026-09-04"
  }
]
```

## What happens on ingest

Each row is normalized into `data/affiliate/fanatics.json`'s `players`/`teams`
maps:

- A row with a `player` becomes an entry under
  `players["<team-abbrev-lowercase>-<slugified-player-name>"].fanatics[]`
  (e.g. `players["chi-caleb-williams"]`).
- A row with no `player` becomes an entry under
  `teams["<team-abbrev-lowercase>"].fanatics[]`.

Nothing else in the app changes — no `app.html` edits, no per-player HTML to
write by hand. The Gear Up module on that player's (or team's) Team Hunt page
picks it up automatically the next time that page is opened. A player or
team with no entry simply shows no Gear Up section at all.

## Rules that stay true no matter what you send

- No offer without a real `fanatics_url` is ever added — a row missing that
  field is rejected, not filled in with a guess.
- No product image is invented — a row with no `image_url` renders the card
  without an image rather than a fake placeholder.
- Nothing here ever touches verified checklist data (rookie/case-hit/auto/
  numbered evidence) — commerce and card verification are separate systems,
  always.
