# GOAT Vault — Top 20 card record schema

This documents the exact shape a record in a player's `cards` array (in `data/goat/goat-vault.json`)
must have once real, sourced card/value data is researched for that player. **Do not add a record to
any player's `cards` array unless every required field is backed by real, checkable evidence.** An
empty `cards: []` is the correct, honest state for a player with no researched data yet — never fill
it with placeholder, estimated, or "looks right" values to make the UI look complete.

## Card record shape

```json
{
  "rank": 1,
  "cardId": "football-tom-brady-2000-playoff-contenders-championship-ticket-auto",
  "year": 2000,
  "manufacturer": "Playoff",
  "set": "Contenders",
  "cardName": "Championship Ticket Autograph",
  "cardNumber": "144",
  "rookie": true,
  "parallel": null,
  "serialNumberedTo": 100,
  "grade": "PSA 10",
  "gradeFilterGroup": "PSA10",
  "image": {
    "localAsset": null,
    "externalVerifiedImage": null,
    "imageSource": null,
    "imageVerifiedDate": null
  },
  "comps": {
    "lastSale": null,
    "lastSaleDate": null,
    "threeSaleAverage": null,
    "highSale": null,
    "lowSale": null,
    "compCount": 0,
    "compWindowDays": 90,
    "insufficientCompsNote": "Fewer than 3 legitimate sold comps found in the last 90 days - do not compute an average."
  },
  "previousComp": null,
  "trend": null,
  "population": {
    "count": null,
    "source": null,
    "asOf": null
  },
  "lastChecked": null,
  "sources": []
}
```

## Field rules

- **rank**: this card's position (1-20) within the player's Top 20. Ranking must primarily reflect
  *current hobby market value* from legitimate sold-comparable evidence — never asking prices, never
  unsold/active eBay listings. See `gradeFilterGroup` below for how grade factors in.
- **grade / gradeFilterGroup**: never compare a PSA 10 value to a raw or PSA 9 value as if equivalent.
  `gradeFilterGroup` must be one of `PSA10`, `PSA9`, `RAW`, or another explicit grade bucket — this is
  what the future PSA 10 / PSA 9 / RAW / ALL filter switches on. Default the *displayed* ranking to
  PSA 10 / Gem Mint comps when sufficient PSA 10 evidence exists; if it doesn't, use the most liquid
  relevant grade and **label it clearly** in the UI — never hide the grade.
- **comps**: `threeSaleAverage`, `highSale`, `lowSale` must only be populated when `compCount >= 3`
  legitimate sold comps exist inside `compWindowDays`. If fewer than 3 exist, leave those fields `null`
  and say so via `insufficientCompsNote` rather than computing a misleading average from 1-2 sales.
  Every comp value needs a `lastSaleDate` — a value with no date context must never be displayed as if
  current.
  Preferred evidence, in order: actual recognized auction results > established card-market/price-
  history databases with visible sold history > other clearly-sourced sold comps. Never an unsold
  listing's asking price.
- **image**: exactly one of `localAsset` / `externalVerifiedImage` should be set once a real image is
  sourced; `imageSource` and `imageVerifiedDate` are then required alongside it. Until then, all four
  stay `null` and the UI renders the shared `goatCardImagePending` placeholder (see `app.html`) — never
  a generated/fake reproduction of the card, never a broken `<img>`.
- **sources**: array of `{name, url}` — the real, named pages/services this record's data came from.
  Required (non-empty) once any comp/value field is populated; may stay empty only while the whole
  record is still a placeholder shell (which, per the rule above, means it shouldn't be in `cards` yet
  at all — this array exists for the researcher's own audit trail during data entry, not as a
  substitute for the "don't add unsourced records" rule).
- **lastChecked**: ISO date this record was last verified against its sources. Every value shown to a
  user must retain enough date context (`lastChecked` plus each comp's `lastSaleDate`) that nothing
  reads as a permanent, undated number.

## Sort/filter axes the data model must support (future UI, not required this pass)

`Highest Value` (default, current market value desc) · `Recent Sale` (`lastSaleDate` desc) ·
`Biggest Mover` (derived from `trend`) · `Rookie Cards` (`rookie===true`) · `Autographs` (`cardName`/
`set` contains an autograph indicator — to be made an explicit boolean field, e.g. `autograph:true`,
once real data entry begins) · `Numbered` (`serialNumberedTo!==null`) · `Vintage` / `Modern` (a `year`
threshold, sport-appropriate). None of these need dedicated UI this pass — the field shapes above
already support all of them without a schema change.
