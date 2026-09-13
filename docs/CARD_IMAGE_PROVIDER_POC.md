# Card Image/Database Provider — Proof of Concept

**Status: research + adapter scaffold only. No production UI wired. No live provider credentials available in this environment.**

This document records what was actually found about each provider, what could and could not be verified, and what a real integration would require. Nothing here should be read as "confirmed working" beyond what's explicitly marked as verified — this environment has no direct page-fetch access to any of these providers' own sites (confirmed via repeated `EGRESS_BLOCKED` errors on `tradingcardapi.com`, `thecardapi.com`, and others — not assumed), so everything below comes from WebSearch result summaries of the providers' own public marketing/docs pages, cross-checked across multiple queries where possible. No live API call was made to any paid provider — no credentials exist in this sandbox for any of them (confirmed via `env | grep`, not assumed).

## 1. Providers evaluated

| Provider | Role evaluated | Depth |
|---|---|---|
| **The Card API** (thecardapi.com) | Primary, this round — sold comps + catalog identity + images | Deep (adapter built) |
| **Trading Card API** (tradingcardapi.com) | Primary, prior round — catalog identity + images | Deep (adapter built) |
| **SportsCardsPro** (sportscardspro.com / pricecharting.com) | Secondary — comparison, pricing | Documented only, not integrated |
| **TCGGraph** (tcggraph.com) | Pokémon/TCG suitability only | Documented only |

## 2. CORRECTION to prior-round Trading Card API pricing

The previous version of this doc stated Trading Card API's early-access pricing as "~$99/month." **That figure could not be independently re-confirmed and appears to have been a mis-attribution** — this round's re-search surfaced an identical-looking `$19.99/mo Starter` / `$49.99/mo Pro` structure, but attributed to a *different, similarly-named product* (`tcgapi.dev`, a TCG-pricing API, not sports cards), not `tradingcardapi.com` itself.

The requester separately supplied a corrected figure for Trading Card API itself: **Starter $19/month (1,000 requests/24h), Pro $49/month (10,000 requests/24h), 14-day free trial, still invite-only/founding-access gated.** This document records that as the current figure **per the requester**, since this environment still cannot fetch `tradingcardapi.com` directly to independently verify it — flagged transparently rather than presented as independently confirmed, same convention used for the Grail Board's Brady/Ohtani comp figures in PR #26.

**Lesson applied this round**: every pricing/spec figure below for every provider is checked against multiple independent search results before being stated, specifically to avoid repeating this mis-attribution.

## 3. The Card API (thecardapi.com) — primary focus this round

### 3.1 Access model — much lower barrier than Trading Card API

**Self-serve, free to start.** Multiple independent search results confirm: free API key issued in seconds, no credit card required. This is a materially lower barrier than Trading Card API's invite-only founding-access gate.

### 3.2 Authentication (as documented)

- REST: `x-market-api-key` header.
- A separate MCP server interface exists using `Authorization: Bearer` — not used by this adapter (REST only).

### 3.3 Sales (sold-comp) API

- Tracks **200,000+ daily card transactions**, described as "true sold prices including Best Offer" (i.e., the accepted Best Offer price, not the initial ask).
- Confirmed sale-record field names from docs: `id`, `title`, `price`, `listing_type`, `sold_at`, `print_run`.
- Rate/quota model: **1,000 rows max per request on all plans**; the enforced limits are total sales rows returned per day and how far back you can query (**default lookback window: 90 days**, per an "Unlimited Lookback" $99/mo add-on description implying a 90-day default on lower tiers); daily counters reset at 00:00:00 UTC; API calls and CSV exports **draw from the same shared daily budget**.
- Paid add-ons found: **Full Daily Feed ($99/mo)** — unlimited pulls for yesterday's sales only; **Unlimited Lookback ($99/mo)** — removes the 90-day query-window limit.
- **This appears usable on the free/self-serve tier** for at least small-scale sales lookups — the free-tier exact daily row cap was not found in accessible search results, only that a cap exists and resets daily.

### 3.4 Catalog (identity) API

- **15.2M+ cards across 306,000+ sets and 15 sports** (confirmed via 2 independent search passes this round; the requester's figures of "16.6M+ cards / 331K+ sets" could not be independently confirmed — could reflect real catalog growth since the 15.2M figure was published, but this document records both rather than silently picking one).
- Every card and set carries a **`ucid`** — a permanent, typed identifier like `UC-1KJZD-TZG7C-6` with a trailing check digit (a typo produces an error, not a wrong card); case-insensitive, dashes optional; **never changes and is never reused** even if the card's own name/year metadata is later corrected. This is a strong stable-ID design — confirmed directly from docs language, not inferred.
- **Catalog access is NOT free**: it's included with the **Pro** plan, or available as a **$29/month add-on on the Builder plan**. All paid plans include a **7-day free trial**.
- Confirmed endpoint shape: fetch-by-id at `/catalog/{ucid}`. **No free-text catalog search endpoint was found** in accessible docs — meaning "search the catalog by player name + year + set" as a single call is not confirmed to exist; only "look up a specific card once you already know its ucid" is documented. This is a real limitation for a workflow that needs to *discover* a ucid from a text query in the first place.

### 3.5 What could NOT be verified

- The Sales API's exact free-tier daily row/request cap (a cap exists; the number wasn't found).
- Any free-text catalog search endpoint or its query-param shape (only `/catalog/{ucid}` is confirmed).
- **Terms of Service**: no dedicated ToS/legal page for thecardapi.com surfaced in any search pass — commercial-use rights, image caching/storage permissions, and redistribution restrictions are **UNKNOWN** and unconfirmed. The docs mention "per-key allowances and bulk catalog licensing are available" via emailing `hello@thecardapi.com`, implying commercial terms are negotiated/clarified directly rather than published on a standard page. **Do not assume broad rights to display, cache, or redistribute returned data or images until this is confirmed directly with the provider** — this document does not overstate rights that were never confirmed.
- Whether Sales-API image URLs (if any are actually returned — not confirmed either) are catalog-canonical images, marketplace listing photos, or something else.
- Exact marketplace/grade/grader/slab-serial field names on a sale record — only `id/title/price/listing_type/sold_at/print_run` are confirmed.

### 3.6 Live POC result

**Not run.** `THE_CARD_API_KEY` is not set anywhere in this environment. Per instructions, no response was faked. The adapter (`api/lib/cardProviders/theCardApi.js`) throws a typed `TheCardApiError` for both the no-key case and a simulated paid-plan-required (402/403) response on the catalog endpoint — both paths are unit-tested (`scripts/test-the-card-api-adapter.js`).

## 4. Trading Card API (tradingcardapi.com) — unchanged findings, pricing corrected (see §2)

- Still gated: reached via an "Apply for Early Access" page, still invite-only/"founding access" per the requester.
- Auth: `Authorization: Bearer <token>`, JSON:API content type (`Accept`/`Content-Type: application/vnd.api+json`), stable `/v1` prefix.
- Documented entity model: Cards, Sets, Players, Teams, Card Images, Attributes, OnCard Relationships.
- Exact JSON:API attribute key names remain unconfirmed — the adapter's `mapCardResource()` is explicitly best-effort/`TODO(live-verify)`, unchanged from last round.
- Live POC: not run (no credentials).

## 5. SportsCardsPro / PriceCharting

- Base URL `https://www.pricecharting.com`, endpoint `/api/product`, a 40-character access token per subscription passed as the `t` query parameter.
- **Paid subscription required** for any API access; CSV bulk export gated further to "Legendary" tier.
- **Rate limit: 1 request/second**, strictly enforced (account permissions revoked on sustained violation, per docs language).
- **Values only, no historical sales or individual sold transactions exposed via the API** — built from a proprietary blend of eBay + their own Marketplace sold listings, but the API surfaces only the *current computed value*, not the underlying sales ledger. **Confirmed unsuitable as a sold-comp source** on its own terms.
- No commercial-use terms found in accessible search results.

## 6. TCGGraph — Pokémon/TCG suitability only (kept separate from sports-card coverage)

- **Pricing (confirmed this round, 2 independent sources)**: Starter **$19/month, 25,000 credits** (~12,500 searches), 2,500 credits/day cap, **60 req/min**, commercial-use license included. Growth tier: $59/mo, 150,000 credits, 300 req/min. These figures match what the requester independently stated — genuinely corroborated this time, unlike the earlier Trading Card API pricing mix-up.
- Shared core schema (`id, name, set, rarity, artist, images, prices, legalities`) plus a game-specific `gameData` payload; both REST and GraphQL.
- Provides TCGplayer (USD) and Cardmarket (EUR) pricing on the same record — a real dual-source pricing signal, but this is market/listing-style pricing data, not confirmed as individually-traceable sold transactions.
- **Sports-card coverage: none** — confirmed again this round; TCGGraph is explicitly TCG-only (Pokémon, Magic, Lorcana, etc.).
- Image CDN reported as unmetered per the requester's figures; not independently re-confirmed via search this round (not the focus of this round's research pass).
- **No live query run** — no credentials, and this environment cannot reach tcggraph.com directly.
- **Recommendation unchanged: remains the leading Pokémon/TCG candidate**, kept entirely separate from sports-card provider decisions.

## 7. Provider comparison

| | The Card API | Trading Card API | SportsCardsPro | TCGGraph |
|---|---|---|---|---|
| Signup friction | Low — free key, self-serve, no CC | High — invite-only founding access | Medium — paid subscription required | Low-medium — paid, self-serve |
| Pricing | Free tier + Pro/Builder+add-on for Catalog | Starter $19/mo, Pro $49/mo (per requester, unconfirmed by us) | Paid only; tier unclear from public docs | $19/mo Starter, $59/mo Growth (confirmed) |
| Sports coverage | 15 sports, 15.2M+ cards (or 16.6M+ per requester) | Claimed broad sports+TCG coverage, unconfirmed depth | Broad, price-guide focused | None |
| TCG coverage | Not confirmed as a focus | Claimed, unconfirmed depth | None found | Primary focus (Pokémon, Magic, Lorcana, etc.) |
| Catalog size | 306,000+ sets (or 331K+ per requester) | Not found | Not found (price-guide product, not a card catalog) | Not applicable (TCG, not sports) |
| Images | Catalog images described; Sales-API image fields unconfirmed | Front/back + 3 thumbnail sizes described | Not a focus | CDN-delivered, unmetered per requester |
| Sold comps | **Yes — explicit sales API, 200K+ daily transactions, true Best Offer prices** | Not confirmed to exist | **No — current values only, no sales ledger** | Pricing data, not confirmed sold comps |
| Best Offer accuracy | Documented as "true accepted price," not asking price | Unconfirmed | Not applicable | Not applicable |
| Stable card IDs | **Yes — `ucid`, permanent, check-digit format, confirmed** | Relational IDs implied (JSON:API), format unconfirmed | Not confirmed | Standard `id` field, permanence unconfirmed |
| Rate limits | 1,000 rows/request; daily cap (exact free number unconfirmed) | 1,000/day (Starter) or 10,000/day (Pro), per requester | **1 req/second, hard-enforced** | 60 req/min (Starter), confirmed |
| Commercial-use terms | **Unconfirmed — no ToS page found; contact required** | Unconfirmed | Unconfirmed | **Confirmed — commercial-use license included in paid tiers** |
| Caching/storage terms | Unconfirmed | Implied CDN-hotlink model, not explicit | Unconfirmed | Confirmed permitted, per requester |
| Suitability for CardStorm | **Best-positioned candidate found so far** — see §9 | Viable but gated and unconfirmed on key details | Pricing cross-check only, never sold comps/images | Pokémon-only, future work |

## 8. Normalized adapter (built, not live-verified)

Files (extends, does not replace, the abstraction from the prior round):
- `api/lib/cardProviders/normalizeCard.js` — provider-agnostic catalog/identity normalization (unchanged).
- `api/lib/cardProviders/tradingCardApi.js` — Trading Card API adapter (unchanged).
- `api/lib/cardProviders/theCardApi.js` (**new**) — The Card API adapter: `searchSales()` (Sales API), `getCatalogCardByUcid()` (Catalog-by-id), `mapSaleRecord()` (uses only the 6 confirmed field names), `mapCatalogRecord()` (recognizes `ucid`, leaves everything else null pending live verification), and `scoreCardMatch()` — a strong-field match scorer (player/year/set/cardNumber/parallel/grade/grader) that explicitly does **not** use title-text similarity as identity evidence.
- `api/lib/cardProviders/normalizeSaleComp.js` (**new**) — normalizes a sale record into the same comp vocabulary already used by `data/intelligence/grail-board.json` (`EXACT_CERT_CONFIRMED` / `SAME_CARD_AND_GRADE_COMP` / `SIMILAR_ITEM_COMP` / `UNVERIFIED`). **Actively rejects active/asking-price listings in code** — an `active`/`for_sale`/`asking`-type record is never returned as if it were a comp, regardless of match score.
- `api/card-image-poc.js` — extended (not rebuilt) to accept `{ provider: "tradingcardapi" | "thecardapi", mode: "catalog" | "sales", query, expectedFields }`. Honest "provider not configured" responses per-provider; the catalog mode for The Card API honestly reports that no free-text catalog search endpoint is confirmed to exist, rather than guessing one.

`verificationStatus` values (catalog): `PROVIDER_MATCHED`, `PROVIDER_AMBIGUOUS`, `PROVIDER_NO_MATCH`, `PROVIDER_ERROR`. `compType` values (sales/comps): `EXACT_CERT_CONFIRMED`, `SAME_CARD_AND_GRADE_COMP`, `SIMILAR_ITEM_COMP`, `UNVERIFIED`.

## 9. The 10 proof-of-concept test cards (unchanged from prior round — reused, not redefined)

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

**Live search was not run against The Card API (or any provider) for any of these 10 cards** — `THE_CARD_API_KEY` is not set anywhere in this environment, and this sandbox cannot reach `thecardapi.com` directly to test even unauthenticated/public access. Reported plainly, not simulated.

## 10. Grail Board suitability — specific assessment

Per the five questions posed:
1. **Can it return a real image?** Unconfirmed — no live test possible; Sales-record image fields aren't even confirmed to exist by name.
2. **Can it return recent completed sales?** Very likely yes, based on documented scope (200K+ daily transactions, explicit Best Offer handling) — but unverified live.
3. **Can CardStorm distinguish exact-cert from same-card/grade comp?** The adapter is built to do this correctly (`scoreCardMatch()` + `classifyCompType()`, unit-tested), but this depends on the live API actually returning grade/grader/slab-serial fields, which aren't confirmed to exist by name yet.
4. **Can we retain a direct source URL?** Not confirmed — no `sourceUrl`-equivalent field found in the 6 confirmed sale fields.
5. **Can we safely label Exact Cert Sale / Recent PSA 10 Comp / Similar Item Comp?** Yes, structurally — the normalizer enforces this vocabulary and never lets an active listing through as a comp. Whether the *live data* ever actually qualifies as `EXACT_CERT_CONFIRMED` depends on whether slab-serial data is really in the response.

**Not yet flagged as a major win** — the building blocks look promising on paper, but this is exactly the gap a live credentialed run would close, and this PR could not obtain credentials.

## 11. Architecture rule compliance

- No provider API key appears in `app.html`, any browser-executed JS, any committed JSON, or any client-visible config.
- All provider calls are server-side only, reading exclusively from `process.env.TRADING_CARD_API_KEY` or `process.env.THE_CARD_API_KEY`.
- `api/card-image-poc.js` is not referenced from `index.html` or `app.html`.
- Unit tests explicitly assert both keys never appear in a normalized record/comp or its JSON serialization (`scripts/test-card-provider-adapter.js` test 9; `scripts/test-the-card-api-adapter.js`'s no-secret-leakage test).

## 12. Recommendation

- **The Card API is now the stronger near-term candidate**: free self-serve access removes the biggest blocker Trading Card API has (invite-only gating), it has an explicit sold-comps API (which Trading Card API doesn't appear to have at all), and its `ucid` stable-identifier design is genuinely well thought out. **Recommended next step: actually get a free key and re-run this exact adapter against the 10 cards** — this is now cheap and fast to try, unlike Trading Card API's application process.
- **Trading Card API** remains a fallback/comparison candidate once (if) founding access is granted — its catalog-only focus and unconfirmed sales capability make it a weaker fit for the sold-comp use case specifically.
- **SportsCardsPro**: pricing cross-check only, never sold comps or images.
- **TCGGraph**: unchanged, Pokémon/TCG only.

## 13. Risks

- **The Card API's commercial-use/caching/redistribution terms are entirely unconfirmed** — this is the single biggest open risk before any real integration; must be resolved directly with the provider (`hello@thecardapi.com`) before displaying any returned image or data in production.
- Catalog access requires paid tier ($29/mo add-on minimum) — a text-searchable catalog (needed to go from "player + year + set" to a `ucid`) is not confirmed to exist at all, paid or free; this could mean Catalog is only usable if you already know the ucid, which undercuts its usefulness as a discovery layer.
- Sales-API field names beyond the 6 confirmed ones are unknown — grade/grader/slab-serial/image/source-URL support cannot be assumed.
- Trading Card API's pricing was already mis-attributed once this project; the requester's corrected figures for it are recorded here as unconfirmed-by-us, not as independently verified fact.

## 14. Next step

Obtain a free `THE_CARD_API_KEY` (self-serve signup, no credit card per its own marketing) and re-run `scripts/test-the-card-api-adapter.js`-style calls for real against all 10 cards via `api/card-image-poc.js`. This is now the cheapest, fastest way to close the biggest open gap in this document — whether the Sales API's real response shape actually supports exact-cert vs comparable-sale labeling and returns usable images.
