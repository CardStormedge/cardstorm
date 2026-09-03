# Fanatics offer import format

Hand Claude a CSV or JSON file in this shape and it can be ingested straight
into `data/affiliate/fanatics.json` without touching `app.html` or any
player-page HTML — the Gear Up module reads the data file at runtime.

## CSV columns (one row per offer)

```
player,team,product_title,product_type,fanatics_url,image_url,image_source,image_verified_date,price,sale_price,collection,source,last_verified,last_checked,status
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
- `image_url` — **optional.** A verified product image URL, or a path to a
  local CardStorm asset (e.g. `assets/fanatics/nyg-jaxson-dart-limited-royal.webp`)
  if you supply the file separately. **Leave blank if you don't have a
  confirmed exact-product image — never send a guessed, generic, or
  stock-photo URL.** A blank `image_url` is a completely normal, expected
  state: the offer still renders and is still fully clickable, just with
  CardStorm's own "OFFICIAL FANATICS GEAR" placeholder treatment instead of
  a photo. Image verification is independent from offer verification — a
  product can be fully live (real URL, real title, real price) with its
  image still pending.
- `image_source` — optional, only meaningful alongside `image_url` (e.g.
  "Fanatics")
- `image_verified_date` — optional, `YYYY-MM-DD`, only meaningful alongside
  `image_url` — when that exact photo was confirmed to match the product
- `price` / `sale_price` — as strings, e.g. `$129.99` (`sale_price` optional)
- `collection` — optional, e.g. "ROOKIE COLLECTION" — shown as a small
  label above the product title. **Only send this if the source itself
  labels the product a Rookie Collection item** — never inferred from the
  player being a rookie.
- `source` — where this came from, e.g. "Fanatics official product page"
- `last_verified` — `YYYY-MM-DD` — offer details (title/price/URL) were
  validated
- `last_checked` — optional, `YYYY-MM-DD` — most recent availability/price
  re-check. Kept separate from `last_verified` and `image_verified_date` so
  a later "still in stock at this price" pass can update just this field.
- `status` — optional, internal/audit-only, never shown to users:
  `LIVE_VERIFIED` (url/title/price/image all confirmed),
  `URL_VERIFIED_PRICE_VERIFIED_IMAGE_PENDING` (url/title/price confirmed,
  no image yet — the normal state for a freshly supplied offer),
  `REVIEW_REQUIRED` (something didn't check out and needs a human look
  before this offer should be trusted), or `INACTIVE` (the product is no
  longer available — the record stays in the file for history but is
  excluded from Gear Up, never auto-deleted). Defaults to
  `URL_VERIFIED_PRICE_VERIFIED_IMAGE_PENDING` if omitted.

## Featured-product order

When a player has more than one offer, they're sorted automatically (never
hand-ordered) by: (1) an offer whose `collection` is exactly "ROOKIE
COLLECTION", (2) a primary/team jersey, (3) an alternate jersey, (4) a
white/away jersey, (5) a T-shirt, (6) everything else. The category is read
from `product_type`/`product_title` — nothing needs to be pre-sorted in the
file you supply.

## Display cap

Only the first 3 offers (after sorting) show directly on a player's Gear Up
card. A 4th+ offer is still stored and still real — it appears behind a
compact "VIEW MORE GEAR" toggle rather than growing the page into a catalog.

## Duplicate control

Before adding a new offer, it's checked against every existing offer's `url`
first (the strongest key), then `player`+`title`, then `team`+`title` — the
same exact offer is never stored or rendered twice. A price/availability
update to something already on file edits that record in place (`price`,
`sale_price`, `last_checked`) rather than appending a duplicate.

## Equivalent JSON shape (also acceptable)

```json
[
  {
    "player": "Caleb Williams",
    "team": "Chicago Bears",
    "product_title": "Caleb Williams Chicago Bears Nike Rookie Collection Game Jersey",
    "product_type": "Rookie Jersey",
    "fanatics_url": "https://www.fanatics.com/...",
    "image_url": null,
    "image_source": null,
    "image_verified_date": null,
    "price": "$129.99",
    "sale_price": null,
    "collection": "ROOKIE COLLECTION",
    "source": "Fanatics official product page",
    "last_verified": "2026-09-04",
    "status": "URL_VERIFIED_PRICE_VERIFIED_IMAGE_PENDING"
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
- No product image is invented — a row with no `image_url` renders
  CardStorm's own deliberate "image pending" treatment (a shirt-outline icon
  and an "OFFICIAL FANATICS GEAR" label), never a broken image, a generic
  stock photo, or something that could be mistaken for the real jersey.
- Nothing here ever touches verified checklist data (rookie/case-hit/auto/
  numbered evidence) — commerce and card verification are separate systems,
  always.
