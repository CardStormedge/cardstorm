// scripts/checklists/registry.js
//
// Single source of truth (Node/ingestion side) for which sports and product
// years CardStorm's checklist pipeline knows about, plus the registry of
// manufacturer sources a future ingestion run should target for each
// sport/year/product combination.
//
// This mirrors, on purpose, the `SPORTS`/`YEARS` constant defined in
// app.html (search for "const SPORTS=" there) — that is the client-side
// single point of change for the UI's sport/year tabs, this file is the
// server/ingestion-side single point of change for what the pipeline
// attempts to fetch. Adding a future year (e.g. 2027) or a new product
// requires editing exactly these two files, not scattered call sites.
//
// IMPORTANT: this file lists *known* products and *candidate* official
// source URLs so a future ingestion run has a real target list. Listing a
// URL here is not a claim that CardStorm has fetched or verified it — see
// each entry's `verified` field, which importer runs are expected to flip
// to a real ISO date + sourceStatus once (and only once) that exact URL has
// actually been fetched and parsed successfully in this repo. As of the
// checklist-recovery-ingestion session (2026-09-15), every entry below is
// `verified: null` because official manufacturer sites were unreachable
// from the ingestion sandbox (network egress proxy returned 403 for
// topps.com, panini.com and paninisamerica.net). Do not flip `verified`
// without an actual successful fetch+parse to point to.

const SPORTS = ['football', 'baseball', 'basketball'];
const YEARS = ['2024', '2025', '2026'];

const MANUFACTURERS = {
  TOPPS: 'Topps',
  PANINI: 'Panini',
};

// productKey -> { sport, year, manufacturer, brand, product, sourceType, sourceUrl, verified }
// `sourceType` is one of: 'manufacturer-checklist-page', 'manufacturer-press-release'.
// `verified` is null until a real ingestion run records { fetchedAt, status }.
const PRODUCT_SOURCE_CANDIDATES = [
  {
    key: 'football|2026|topps-chrome',
    sport: 'football',
    year: '2026',
    manufacturer: MANUFACTURERS.TOPPS,
    brand: 'Topps',
    product: 'Topps Chrome',
    sourceType: 'manufacturer-checklist-page',
    sourceUrl: 'https://www.topps.com/checklists',
    verified: null,
  },
  {
    key: 'basketball|2026|topps-chrome',
    sport: 'basketball',
    year: '2026',
    manufacturer: MANUFACTURERS.TOPPS,
    brand: 'Topps',
    product: 'Topps Chrome',
    sourceType: 'manufacturer-checklist-page',
    sourceUrl: 'https://www.topps.com/checklists',
    verified: null,
  },
  {
    key: 'football|2025|donruss',
    sport: 'football',
    year: '2025',
    manufacturer: MANUFACTURERS.PANINI,
    brand: 'Panini',
    product: 'Donruss',
    sourceType: 'manufacturer-checklist-page',
    sourceUrl: 'https://www.paninisamerica.net/checklist',
    verified: null,
  },
  {
    key: 'baseball|2025|topps-chrome',
    sport: 'baseball',
    year: '2025',
    manufacturer: MANUFACTURERS.TOPPS,
    brand: 'Topps',
    product: 'Topps Chrome',
    sourceType: 'manufacturer-checklist-page',
    sourceUrl: 'https://www.topps.com/checklists',
    verified: null,
  },
];

function productsFor(sport, year) {
  return PRODUCT_SOURCE_CANDIDATES.filter((p) => p.sport === sport && p.year === year);
}

module.exports = { SPORTS, YEARS, MANUFACTURERS, PRODUCT_SOURCE_CANDIDATES, productsFor };
