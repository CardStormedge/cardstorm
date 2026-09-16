// Image-registry schema/lookup check for the image-asset-completion pass.
//
// data/intelligence/image-registry.json is the single centralized image mapping used by
// resolveCsImage() in app.html for Product Intelligence, Grail Board, Team Hunt and
// Watchlist. This script guards two things without needing a browser:
//   1. Every entry has the fields the schema promises, and every repoAsset it points at
//      actually exists in the repo (no dangling reference).
//   2. Every BOX_ART path app.html references resolves to a real file on disk, so the
//      white-background fix wired into app.html isn't pointing at a missing asset.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'intelligence', 'image-registry.json');
const APP_HTML = path.join(ROOT, 'app.html');

let failures = 0;
function fail(msg) { failures++; console.error('FAIL - ' + msg); }
function ok(msg) { console.log('OK - ' + msg); }

if (!fs.existsSync(REGISTRY_PATH)) {
  fail('data/intelligence/image-registry.json does not exist');
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  ok('image-registry.json is valid JSON');
} catch (e) {
  fail('image-registry.json failed to parse: ' + e.message);
  process.exit(1);
}

if (!Array.isArray(registry.entries) || registry.entries.length < 10) {
  fail(`registry.entries is missing or too small (got ${registry.entries && registry.entries.length})`);
} else {
  ok(`registry has ${registry.entries.length} entries`);
}

const REQUIRED_FIELDS = ['entityType', 'sourceType', 'verificationStatus', 'usageRightsStatus', 'notes'];
let missingFieldCount = 0;
let danglingAssetCount = 0;
let realAssetCount = 0;
let noImageCount = 0;
for (const entry of registry.entries || []) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in entry)) { missingFieldCount++; break; }
  }
  if (entry.repoAsset) {
    realAssetCount++;
    if (!fs.existsSync(path.join(ROOT, entry.repoAsset))) {
      danglingAssetCount++;
      fail(`registry entry repoAsset does not exist on disk: ${entry.repoAsset}`);
    }
  } else if (entry.verificationStatus === 'NO_VERIFIED_CARD_IMAGE_AVAILABLE') {
    noImageCount++;
  }
}
if (missingFieldCount) fail(`${missingFieldCount} registry entries are missing one or more required schema fields (${REQUIRED_FIELDS.join(', ')})`);
else ok('every registry entry carries the required schema fields');
if (!danglingAssetCount) ok(`all ${realAssetCount} repoAsset-backed entries point at real files on disk`);
ok(`${noImageCount} entries are honestly marked with no verified image (fallback-tile path)`);

// ---- BOX_ART wiring check: every path app.html's BOX_ART const references must exist ----
const appSrc = fs.readFileSync(APP_HTML, 'utf8');
const boxArtMatch = appSrc.match(/const BOX_ART=\{([\s\S]*?)\n\};/);
if (!boxArtMatch) {
  fail('could not find `const BOX_ART={...}` in app.html');
} else {
  const paths = [...boxArtMatch[1].matchAll(/"(assets\/boxes\/[^"]+\.webp)"/g)].map(m => m[1]);
  if (paths.length < 10) fail(`only found ${paths.length} BOX_ART paths - extraction likely broken`);
  else ok(`found ${paths.length} BOX_ART paths in app.html`);
  let missing = 0;
  for (const p of paths) {
    if (!fs.existsSync(path.join(ROOT, p))) { missing++; fail(`BOX_ART references a missing file: ${p}`); }
  }
  if (!missing) ok('every BOX_ART path resolves to a real file on disk');
  const stillFlat = paths.filter(p => !p.includes('/transparent/'));
  if (stillFlat.length) fail(`${stillFlat.length} BOX_ART entries still point at the flat (non-background-removed) asset, not assets/boxes/transparent/: ${stillFlat.join(', ')}`);
  else ok('every BOX_ART entry points at the background-removed transparent asset, not the original flat-white file');
}

// ---- resolver + fallback plumbing exists in app.html ----
if (/function resolveCsImage\(/.test(appSrc)) ok('app.html defines resolveCsImage(), the single centralized lookup function');
else fail('app.html is missing resolveCsImage()');
if (/function csFallbackTile\(/.test(appSrc)) ok('app.html defines csFallbackTile(), the one consistent branded fallback component');
else fail('app.html is missing csFallbackTile()');
if (/\.csFallback\{/.test(appSrc)) ok('app.html defines the shared .csFallback CSS used by the fallback component');
else fail('app.html is missing the .csFallback CSS rules');

// ---- Grail Board / Team Hunt / Watchlist route through the resolver, not a
//      hardcoded one-off image path (image-quality-pass round 2 requirement) ----
if (/function csImageBlock\(/.test(appSrc)) ok('app.html defines csImageBlock(), the shared resolveCsImage()-first/fallback-second render helper');
else fail('app.html is missing csImageBlock()');
const grailUsesResolver = /function grailCardTileHTML\([\s\S]{0,3000}?\n\}/.test(appSrc) && /function grailCardTileHTML\([\s\S]{0,3000}?csImageBlock\(/.test(appSrc);
const watchUsesResolver = /function watch\(\)\{[\s\S]{0,3000}?csImageBlock\(/.test(appSrc);
if (grailUsesResolver) ok('Grail Board tiles call csImageBlock() (registry-first), not csFallbackTile() directly');
else fail('Grail Board still calls csFallbackTile() directly instead of going through csImageBlock()/resolveCsImage()');
if (watchUsesResolver) ok('Watchlist tiles call csImageBlock() (registry-first), not csFallbackTile() directly');
else fail('Watchlist still calls csFallbackTile() directly instead of going through csImageBlock()/resolveCsImage()');

// ---- No third-party hotlinked images left in REALPROD (round-2 requirement:
//      rehost or downgrade to fallback, never leave a broken assumption) ----
const realprodMatch = appSrc.match(/const REALPROD=\{([\s\S]*?)\n\};/);
if (!realprodMatch) {
  fail('could not find `const REALPROD={...}` in app.html');
} else {
  const hotlinks = [...realprodMatch[1].matchAll(/"img"?:"(https?:\/\/[^"]+)"/g)]
    .concat([...realprodMatch[1].matchAll(/img:"(https?:\/\/[^"]+)"/g)])
    .map(m => m[1]);
  const repoControlled = hotlinks.filter(u => /(^|\.)cardstorm|githubusercontent|\/assets\//i.test(u));
  const thirdParty = hotlinks.filter(u => !repoControlled.includes(u));
  if (thirdParty.length) fail(`REALPROD still hotlinks ${thirdParty.length} third-party image URL(s), not rehosted or downgraded to fallback: ${thirdParty.join(', ')}`);
  else ok('REALPROD has no third-party-hotlinked image URLs left (cardsmithsbreaks.com/tradingcardmarket.com entries were downgraded to the honest fallback)');
}

// ---- Real (repoAsset/imageUrl-backed) registry entries carry complete
//      source/rights metadata, not just the schema keys existing ----
const realEntries = (registry.entries || []).filter(e => e.repoAsset || e.imageUrl);
let incompleteRights = 0;
for (const e of realEntries) {
  if (!e.sourceType || !e.verificationStatus || !e.usageRightsStatus || !e.notes) incompleteRights++;
}
if (realEntries.length && !incompleteRights) ok(`all ${realEntries.length} real-image registry entries carry complete sourceType/verificationStatus/usageRightsStatus/notes metadata`);
else if (incompleteRights) fail(`${incompleteRights} real-image registry entries are missing sourceType/verificationStatus/usageRightsStatus/notes`);

if (failures) {
  console.error(`\n${failures} IMAGE-REGISTRY TEST(S) FAILED`);
  process.exit(1);
} else {
  console.log('\nALL IMAGE-REGISTRY TESTS PASSED');
}
