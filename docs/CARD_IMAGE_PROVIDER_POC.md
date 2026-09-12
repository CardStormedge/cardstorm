# Card Image/Database Provider — Proof of Concept

**Status: research + adapter scaffold only. No production UI wired. No live provider credentials available in this environment.**

This document records what was actually found about each provider, what could and could not be verified, and what a real integration would require. Nothing here should be read as "confirmed working" beyond what's explicitly marked as verified — this environment has no direct page-fetch access to any of these providers' own sites (confirmed via repeated `EGRESS_BLOCKED` errors on `tradingcardapi.com`, `api.tradingcardapi.com`, and others — not assumed), so everything below comes from WebSearch result summaries of the providers' own public marketing/docs pages, cross-checked across multiple sources where possible. No live API call was made to any paid provider — no credentials exist in this sandbox for any of them.

## 1. Providers evaluated

| Provider | Role evaluated | Depth |
|---|---|---|
| **Trading Card API** (tradingcardapi.com) | Primary — catalog identity + images | Deep (adapter built) |
| **SportsCardsPro** (sportscardspro.com / pricecharting.com) | Secondary — comparison, pricing | Documented only, not integrated |
| **TCGGraph** (tcggraph.com) | Pokémon/TCG suitability only | Documented only, single-query depth |
| **The Card API** (thecardapi.com) | Discovered during research, not requested but relevant | Documented only, flagged as worth a look |

## 2. Trading Card API (tradingcardapi.com) — primary provider

### 2.1 Access model — the most important finding

**This is NOT a self-serve API.** It's currently in a gated beta reached via an "Apply for Early Access" page. Public pricing found: **$99/month for early-access pricing**, with "founding access" limited to as few as 5 slots at a time, opened as the provider scales. There is no documented free tier. This means a real integration requires a business decision to apply and likely pay, not just a signup form — and there's no guarantee of being granted a slot on request.

### 2.2 Authentication (as documented)

- Bearer token: `Authorization: Bearer <token>`
- JSON:API content negotiation: `Accept: application/vnd.api+json`, `Content-Type: application/vnd.api+json`
- API served under a stable `/v1` prefix; the API key is shown in the docs portal after subscribing.

### 2.3 Data model (as documented)

The provider describes its entities as: **Cards, Sets, Players, Teams, Card Images, Attributes, and OnCard Relationships** — a normalized relational model (JSON:API `relationships`/`included`), not one flat card object. It claims coverage across sports card and general trading card data (sets, cards, players, teams, variations).

### 2.4 What could NOT be verified

- **Exact endpoint path and query-param shape** for search (e.g., the precise filter param name) — one search result stated the cards resource lives at `https://api.tradingcardapi.com/cards`; another described a `/v1` prefix. The adapter uses `https://api.tradingcardapi.com/v1/cards` as the most consistent reading, flagged as needing live confirmation.
- **Exact JSON:API attribute key names** (e.g., whether year is `attributes.year` or something else) — not published in any page this environment could reach. **Per the "do not guess field names" instruction, the adapter does not hardcode a confident mapping** — see §5.
- **Rate limits, storage/caching rules, and commercial-use terms** — the provider's rate-limits doc page exists (`tradingcardapi.com/docs/api/rate-limits`) but its contents weren't retrievable via search snippets, and this environment cannot fetch the page directly. Image delivery is described as "global CDN via DigitalOcean Spaces with versioned URLs for automatic cache invalidation" — this implies images are meant to be hotlinked/CDN-served rather than downloaded and re-hosted, but no explicit caching/storage policy was found.
- **Image dimensions/quality** — described only as "front/back images with 3 auto-generated thumbnail sizes (small/medium/large)," no pixel dimensions found.

### 2.5 Live POC result

**Not run.** `TRADING_CARD_API_KEY` is not set anywhere in this environment (confirmed: `env | grep -i TRADING_CARD` returns nothing). Per the task's explicit instruction, no response was faked. The adapter (`api/lib/cardProviders/tradingCardApi.js`) throws a typed `TradingCardApiError` when the key is absent rather than returning any card data — this is unit-tested (`scripts/test-card-provider-adapter.js`).

## 3. SportsCardsPro / PriceCharting

- Base URL: `https://www.pricecharting.com`, endpoint `/api/product`.
- Auth: a 40-character access token per subscription, passed as the `t` query parameter.
- **Requires a paid subscription** to use the API at all; CSV bulk export is gated further, to "Legendary" tier subscribers only.
- **Rate limit: 1 request/second**, documented as strictly enforced — "any more than that and your calls will be blocked and your account permissions revoked if it persists."
- **Values only, no historical sales**: the API returns *current* item values in various grades/conditions, built from a proprietary algorithm blending eBay + their own Marketplace sold listings. It does **not** expose the underlying individual sold transactions or historical price-over-time data via the API (CSV/API access is to current guide values, not a sales ledger) — this makes it **unsuitable as a sold-comps source** on its own terms, consistent with the instruction to never blend catalog/pricing-guide data into the sold-comps pipeline.
- No explicit commercial-use terms were found in accessible search results; would need direct confirmation from PriceCharting before any commercial use.
- **Suitability assessment**: reasonable for *current market value* estimates and possibly base identity data (their product catalog is broad and includes sports cards), weak for real sold-comp evidence and weak for card images specifically (its core product is a price guide, not an image database) — not evaluated further, per instructions, beyond this documentation pass.

## 4. TCGGraph — Pokémon/TCG suitability only

- Positioned as "one API for every trading card game," with both REST and GraphQL, Bearer-token auth, and a shared core schema (`id, name, set, rarity, artist, images, prices, legalities`) plus a game-specific `gameData` payload.
- Provides both TCGplayer (USD) and Cardmarket (EUR) pricing on the same card record, with trend/rolling-average and foil pricing quoted separately — a real pricing-comparison feature, though these prices are market/listing-style pricing-guide figures, not necessarily individually traceable sold transactions; treat as **pricing data, not sold comps**, unless a specific endpoint is confirmed to expose real completed-sale records.
- **Sports card coverage: none found.** TCGGraph's own positioning explicitly focuses on trading card games (Pokémon, Magic, Lorcana, etc.) rather than sports cards — confirms it is Pokémon/TCG-only, as expected, and not a candidate for the sports-card catalog/image role.
- No live query was run (no credentials, and this environment cannot reach tcggraph.com directly to test unauthenticated/public access). Pricing tiers and exact rate limits were not found in accessible search results.
- **Suitability for CardStorm's Pokémon section**: plausible for a *future* Pokémon pricing/catalog integration given its stated multi-source pricing and shared schema, but this needs a real credentialed test before any commitment — not attempted here per the "no full Pokémon integration in this PR" instruction.

## 5. Normalized adapter (built, not live-verified)

Files:
- `api/lib/cardProviders/normalizeCard.js` — provider-agnostic normalization to CardStorm's shared shape (`provider, providerCardId, player, sport, year, manufacturer, brand, set, cardNumber, parallel, frontImageUrl, backImageUrl, sourceUrl, confidence, verificationStatus`). Every field is `null` unless the provider actually supplied it.
- `api/lib/cardProviders/tradingCardApi.js` — the Trading Card API adapter: correct (as-documented) base URL, auth headers, and JSON:API request shape; a best-effort `mapCardResource()` that extracts fields from the *documented entity model* (Cards/Sets/Players/relationships) but explicitly does **not** claim the exact attribute key names are confirmed — every guessable key is marked `TODO(live-verify)` in the source and must be checked against one real captured response before this is trusted beyond this POC.
- `api/card-image-poc.js` — temporary, backend-only endpoint (`POST /api/card-image-poc`, marked `X-CardStorm-POC` header, not linked from any frontend page). Returns an honest "provider not configured" response when `TRADING_CARD_API_KEY` is absent; never fabricates a card record.

`verificationStatus` values: `PROVIDER_MATCHED`, `PROVIDER_AMBIGUOUS` (multiple candidates — never auto-picked), `PROVIDER_NO_MATCH`, `PROVIDER_ERROR`.

## 6. The 10 proof-of-concept test cards (identities only — no live search possible)

Reused from the already-verified Grail Board dataset (`data/intelligence/grail-board.json`) where possible, plus two additional real, independently-identifiable cards to reach 2-per-player without inventing anything:

| # | Player | Card |
|---|---|---|
| 1 | Tom Brady | 2000 Upper Deck SP Authentic #118 (rookie), PSA 10 |
| 2 | Tom Brady | 2000 Playoff Contenders Championship Ticket Auto #144, BGS 9/Auto 10, /100 |
| 3 | Michael Jordan | 1986 Fleer #57 (rookie), PSA 10 |
| 4 | Michael Jordan | 1997 SkyBox Metal Universe Precious Metal Gems Green #23, /10 |
| 5 | Shohei Ohtani | 2018 Topps Chrome #150 (base rookie) |
| 6 | Shohei Ohtani | 2018 Topps Chrome Rookie Autograph #RA-SO, PSA 10 |
| 7 | Patrick Mahomes | 2017 Panini Prizm Disco #269 (rookie), PSA 10 |
| 8 | Patrick Mahomes | 2017 Panini Donruss Optic Red Yellow Rated Rookie #177, PSA 10 |
| 9 | Cooper Flagg | 2025 Topps Bowman Chrome Superfractor #BCV-1 (1/1), PSA 9 |
| 10 | Cooper Flagg | 2024 Topps Chrome McDonald's All-American Autograph SuperFractor #78 (1/1), CGC Authentic |

Card #5 (2018 Topps Chrome base #150) is the one identity in this list not already present in the Grail Board dataset — it surfaced during Trading Card API research as a real, well-documented Ohtani rookie (seen listed on Goldin's own site), added here only as a second, cheaper/more-common test case to see whether the provider indexes base cards as reliably as premium ones. **No sold-comp value is claimed or needed for it in this POC** — it is a search-target identity only.

**Live search was not run against any provider for any of these 10 cards** — no credentials exist in this environment for Trading Card API, SportsCardsPro, or TCGGraph, and this sandbox cannot reach any of their live endpoints to test unauthenticated access either. This is reported plainly rather than simulated.

## 7. Architecture rule compliance

- No provider API key appears in `app.html`, any browser-executed JS, any committed JSON, or any client-visible config.
- All provider calls are server-side only (`api/lib/cardProviders/`, `api/card-image-poc.js`), reading the key exclusively from `process.env.TRADING_CARD_API_KEY`.
- `api/card-image-poc.js` is not referenced from `index.html` or `app.html` — it exists only as a backend route for manual/POC testing.
- Unit tests explicitly assert the configured key never appears in a normalized record or its JSON serialization (`scripts/test-card-provider-adapter.js`, test 9).

## 8. Recommendation

- **Primary provider candidate remains Trading Card API**, on paper — broadest documented sports-card coverage and a purpose-built image pipeline — but it cannot be evaluated further without either (a) applying for and being granted early access (currently ~$99/month, limited slots) or (b) the requester providing existing credentials.
- **SportsCardsPro** is a plausible *pricing-guide* secondary signal (current values only, not sold comps, not images) but was not deeply evaluated per instructions and has real rate-limit (1 req/sec) and access-tier constraints of its own.
- **TCGGraph** is out of scope for sports cards entirely; worth a real credentialed look for the Pokémon section specifically, in a future PR.
- **The Card API (thecardapi.com)** surfaced during research as a real alternative worth flagging: 15.2M+ card catalog across 306,000+ sets and 15 sports, with a free API key (no credit card, per its own marketing) and an explicit "sold-price" sales API separate from its catalog — potentially a stronger, more accessible primary candidate than Trading Card API's gated beta, **but not evaluated in depth in this PR** since it wasn't the requested primary target; worth a dedicated look in a follow-up given it appears to have a lower access barrier.

## 9. Risks

- No provider evaluated here has been proven, with real evidence, to reliably return front+back images for the exact certs shown on the Grail Board — this POC could not close that gap without credentials.
- Trading Card API's gated/paid beta access model is itself a project risk (cost + uncertain approval), separate from its technical fit.
- Any future integration must keep this reminder from the requester's own rule intact: **catalog/image data must never be treated as a sold-comp source unless a provider explicitly supplies traceable completed sales** — none of the three primary candidates evaluated here were confirmed to do that reliably (SportsCardsPro explicitly does not expose historical sales; Trading Card API's sales/pricing capability, if any, was not found in accessible docs).

## 10. Next step

Get real credentials for at least one candidate (Trading Card API via its early-access application, or The Card API via its apparently-free signup) and re-run this exact adapter against the same 10 cards to produce the first real, evidence-based per-card table this document is currently missing.
