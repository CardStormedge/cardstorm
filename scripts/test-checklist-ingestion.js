// Tests for the checklist recovery + ingestion pipeline
// (scripts/checklists/*). Exercises real code paths - including a real
// local HTTP fetch over loopback via fetch-source.js - against clearly
// labeled test fixtures (scripts/checklists/fixtures/*.html). None of this
// touches or imports api/cardstorm.js, api/lib/cardProviders/, or anything
// from the card-image-provider POC.
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const { parseToppsChecklistHtml, ingestTopps } = require('./checklists/ingest-topps');
const { parseCheckListRowsHtml, ingestPanini } = require('./checklists/ingest-panini');
const { parseToppsChecklistPdfText, parseChecklistLine } = require('./checklists/ingest-topps-pdf');
const { normalizeChecklist } = require('./checklists/normalize-checklist');
const { validateChecklist } = require('./checklists/validate-checklist');
const { normalizeCard, buildSourceMeta } = require('./checklists/schema');
const { normalizeTeam } = require('./checklists/team-alias');
const { normalizePlayerName, malformedNameReason, playerIdentityKey } = require('./checklists/player-name');
const { fetchSource, NetworkBlockedError } = require('./checklists/fetch-source');
const registry = require('./checklists/registry');

let failures = 0;
function ok(msg) { console.log('OK - ' + msg); }
function fail(msg) { failures++; console.error('FAIL - ' + msg); }
function check(cond, msg) { cond ? ok(msg) : fail(msg); }

const ROOT = path.join(__dirname, '..');
const TOPPS_FIXTURE = fs.readFileSync(path.join(__dirname, 'checklists/fixtures/topps-fixture-checklist.html'), 'utf8');
const PANINI_FIXTURE = fs.readFileSync(path.join(__dirname, 'checklists/fixtures/panini-fixture-checklist.html'), 'utf8');
const TOPPS_PDF_TEXT_FIXTURE = fs.readFileSync(path.join(__dirname, 'checklists/fixtures/topps-pdf-fixture-checklist.txt'), 'utf8');
const TOPPS_PDF_BASKETBALL_FIXTURE = fs.readFileSync(path.join(__dirname, 'checklists/fixtures/topps-pdf-fixture-basketball.txt'), 'utf8');
const TOPPS_PDF_FOOTBALL_FIXTURE = fs.readFileSync(path.join(__dirname, 'checklists/fixtures/topps-pdf-fixture-football.txt'), 'utf8');

(async function main() {
  // ---- 1. Importer parsing (real parser logic against fixtures) -------------
  const toppsRows = parseToppsChecklistHtml(TOPPS_FIXTURE);
  check(toppsRows.length === 7, `Topps fixture parser extracted 7 rows (got ${toppsRows.length})`);
  check(toppsRows[1].rookie === true && toppsRows[0].rookie === false, 'Topps parser correctly reads the RC rookie marker per-row');

  const paniniRows = parseCheckListRowsHtml(PANINI_FIXTURE);
  check(paniniRows.length === 3, `Panini fixture parser extracted 3 rows (got ${paniniRows.length})`);
  check(paniniRows.every((r) => r.rookie === true), 'Panini parser correctly reads the RR rookie marker');
  check(paniniRows[2].team === null, 'Panini parser stores null (not empty string) for a genuinely empty team cell');

  // ---- 1b. Topps PDF checklist parser (real text extracted from real ---------
  //          2024/2025/2026 Topps Series 1 Baseball checklist PDFs fetched
  //          from cdn.shopify.com during the live PDF-ingestion round - see
  //          fixtures/topps-pdf-fixture-checklist.txt and the PR #30 "LIVE
  //          TOPPS CDN PDF INGESTION" comment for the reachability evidence.
  const pdfRows = parseToppsChecklistPdfText(TOPPS_PDF_TEXT_FIXTURE, 'baseball');
  check(pdfRows.length === 11, `Topps PDF-text parser extracted 11 real card rows from the fixture (got ${pdfRows.length})`);
  check(pdfRows[0].player === 'Aaron Judge' && pdfRows[0].team === 'New York Yankees', 'Topps PDF-text parser correctly splits a real space-concatenated "<player> <Team Name><®>" line with no delimiter');
  check(pdfRows.find((r) => r.cardNumber === '4').rookie === true, 'Topps PDF-text parser reads a real trailing "Rookie" subset label as rookie:true');
  check(pdfRows.filter((r) => r.cardNumber === '11').length === 3, 'Topps PDF-text parser correctly keeps all 3 real players of a shared-card-number "League Leaders" combo row as separate rows, not collapsed or dropped');
  check(pdfRows.find((r) => r.cardNumber === '34').player === null, 'Topps PDF-text parser correctly yields no player (not a fabricated one) for a real "Team Card" row, since the team\'s own name prints where a player normally would');
  check(pdfRows.find((r) => r.cardNumber === '43').team === 'Angels', 'Topps PDF-text parser correctly matches the real short "no city" team form Topps prints for the Angels');
  const tabRow = pdfRows.find((r) => r.player === 'Shohei Ohtani');
  check(!!tabRow && tabRow.team === 'Los Angeles Dodgers', 'Topps PDF-text parser correctly splits a real tab-delimited "<player>\\t<team>" line (a different real layout than the space-concatenated one)');
  check(parseChecklistLine('BASE SET', 'baseball') === null, 'Topps PDF-text parser skips a real bare section-header line (no team-name match) rather than guessing a row out of it');
  check(parseChecklistLine('-- 1 of 53 --', 'baseball') === null, 'Topps PDF-text parser skips a real page-separator line');
  check(parseChecklistLine('Checklists provided by Topps reflect the intended configuration of that product at', 'baseball') === null, 'Topps PDF-text parser skips the real disclaimer line Topps prints on every checklist PDF');

  // ---- 1c. Basketball + football PDF parsing - a REAL, DIFFERENT structure ---
  //          from baseball, confirmed by fetching a real 2025-26 Topps
  //          Basketball PDF and a real 2024 Topps Chrome Football PDF (no
  //          trademark symbol at all in either - basketball prints the full
  //          "City Team" name, football prints just the city). Discovered
  //          during the checklist-data-hardening-pass round; the prior
  //          round's basketball/football attempt used an unvalidated team
  //          list assuming baseball's symbol-anchored layout and mostly
  //          returned 0 rows - this is the real fix, built from the real
  //          fetched text, not a guess.
  const bbRows = parseToppsChecklistPdfText(TOPPS_PDF_BASKETBALL_FIXTURE, 'basketball');
  check(bbRows.length === 9, `basketball PDF-text parser extracted 9 real card rows from the fixture (got ${bbRows.length})`);
  check(bbRows[0].player === 'Josh Hart' && bbRows[0].team === 'New York Knicks', 'basketball PDF-text parser correctly splits a real "<player> <City Team>" line with NO trademark symbol (a genuinely different real layout than baseball\'s)');
  check(bbRows.find((r) => r.cardNumber === 'L-17').rookie === true, 'basketball PDF-text parser reads a real trailing "Rookie" subset label as rookie:true');
  check(bbRows.find((r) => r.player === 'Kelly Oubre Jr.').team === 'Philadelphia 76ers', 'basketball PDF-text parser correctly matches a real team name that itself contains a digit ("76ers") without misreading it as part of the card number');
  check(bbRows.find((r) => r.player === 'Kawhi Leonard').team === 'Los Angeles Clippers', 'basketball PDF-text parser correctly matches a real multi-word "Los Angeles Clippers" team name');

  const fbRows = parseToppsChecklistPdfText(TOPPS_PDF_FOOTBALL_FIXTURE, 'football');
  check(fbRows.length === 8, `football PDF-text parser extracted 8 real card rows from the fixture (got ${fbRows.length})`);
  check(fbRows[0].player === 'Kurt Warner' && fbRows[0].team === 'Arizona', 'football PDF-text parser correctly splits a real "<player> <City>" line - no mascot name at all in the real football PDF layout, a genuinely different real structure than both baseball and basketball');
  check(fbRows.find((r) => r.player === 'Ed "Too Tall" Jones').team === 'Dallas', 'football PDF-text parser correctly handles a real player name containing an embedded nickname in quotes without it breaking the team match');
  check(fbRows.find((r) => r.cardNumber === 'F-6').team === 'New York', 'football PDF-text parser correctly lands on the real trailing city even for a real insert-set card number prefix');
  check(fbRows.find((r) => r.cardNumber === '74TF-16').team === 'New England', 'football PDF-text parser correctly matches a real multi-word city ("New England")');

  const pdfMeta = { sport: 'baseball', year: '2099', manufacturer: 'Topps', brand: 'Topps', product: 'Fixture PDF Test Set', sourceType: 'manufacturer-checklist-pdf', sourceUrl: 'https://example.invalid/fixture.pdf' };
  const { rows: normPdfRows, excluded: exclPdfRows } = normalizeChecklist(pdfRows, pdfMeta);
  check(exclPdfRows.some((e) => e.reason.includes('missing player name')), 'normalizeChecklist excludes (with a logged reason, not silently) the real Team Card row\'s empty player field');
  check(normPdfRows.length === pdfRows.length - exclPdfRows.length, 'every real PDF-parsed row is accounted for as either normalized or excluded-with-reason - none silently vanish');
  const pdfValidation = validateChecklist(normPdfRows, { ...pdfMeta });
  check(pdfValidation.duplicateCardNumbers.includes('11'), 'validateChecklist still reports the real shared card number #11 (the League Leaders combo) informationally in duplicateCardNumbers');
  check(pdfValidation.duplicatePlayerCardCombos.length === 0, 'a real multi-player combo card (different players under one shared card number) produces zero duplicatePlayerCardCombos - it is legitimate, not an anomaly');
  check(pdfValidation.status === 'RELEASED', 'a checklist whose only repeated card numbers are legitimate multi-player combo cards (a DIFFERENT player each time) is no longer incorrectly blocked from RELEASED - the corrected validator distinguishes a true duplicate row from a legitimate shared card number');

  // ---- 2. Row normalization: only source-supported fields populated ---------
  const meta = { sport: 'football', year: '2099', manufacturer: 'Topps', brand: 'Topps', product: 'Fixture Test Set', sourceType: 'manufacturer-checklist-page', sourceUrl: 'https://example.invalid/fixture' };
  const card = normalizeCard({ cardNumber: '7', player: 'Fixture Player', team: 'Sample City Somethings', rookie: true }, meta);
  check(card.sport === 'football' && card.year === '2099' && card.cardNumber === '7', 'normalizeCard populates identity fields from meta + raw row');
  check(card.parallel === null && card.autograph === null && card.relic === null, 'normalizeCard leaves unsupported boolean fields as null, not false');
  check(card.verificationStatus === null, 'normalizeCard never sets verificationStatus itself - that is validate-checklist.js\'s job');

  // ---- 3. Duplicate detection: TRUE duplicate vs. LEGITIMATE shared number ----
  const { rows: normTopps, excluded: exclTopps } = normalizeChecklist(toppsRows, meta);
  check(exclTopps.some((e) => e.reason.includes('missing player name') || e.reason.includes('empty player name')), 'normalizeChecklist excludes (not silently drops-without-record) the malformed empty-name fixture row');
  const dupValidation = validateChecklist(normTopps, { sourceUrl: meta.sourceUrl, sourceType: meta.sourceType, manufacturer: meta.manufacturer, sport: meta.sport, year: meta.year, product: meta.product });
  check(dupValidation.duplicateCardNumbers.includes('3'), 'validateChecklist still reports the shared card number #3 informationally in duplicateCardNumbers');
  check(!dupValidation.duplicatePlayerCardCombos.some((k) => k.includes('|3')), 'card #3\'s two DIFFERENT players (a legitimate shared-number/combo-card case) do NOT produce a duplicatePlayerCardCombos anomaly');
  check(dupValidation.duplicatePlayerCardCombos.some((k) => k.includes('|6')), 'validateChecklist flags card #6\'s TRUE duplicate (the SAME player repeated under the same card number) as a duplicatePlayerCardCombos anomaly');
  check(dupValidation.status !== 'RELEASED', 'a checklist that still contains a TRUE duplicate row (same player/team/card-number repeated) is never marked RELEASED - the fix only stops a legitimate shared card number from blocking RELEASED, it does not weaken true-duplicate detection');
  check(dupValidation.missingCardNumbers.includes(5), 'validateChecklist flags the intentional gap (missing #5) in the fixture sequence');

  // ---- 3b. The same distinction, proven against REAL rows already ingested ---
  //          into the repo (data/checklists/baseball/*/topps-series-1.json) -
  //          not invented examples. #5 in the real 2025 file legitimately
  //          lists 3 different players (a real "League Leaders" card); #38 in
  //          the real 2024 file has a genuine parsing-artifact duplicate (the
  //          same player, "Pete Alonso, New York Mets", repeated under card
  //          #38 with only the trailing subset text differing between the two
  //          rows: "Combo Card/Checklist" vs "Combo Cards" - a section-header
  //          fragment that glued onto a re-extracted copy of the same row).
  const realMeta = { sport: 'baseball', year: '2025', manufacturer: 'Topps', brand: 'Topps', product: 'Topps Series 1', sourceType: 'manufacturer-checklist-pdf', sourceUrl: 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/2025_Topps_Series_1_BB_Checklist_-_updated.pdf?v=1784567528' };
  const realLeagueLeadersRows = [
    { ...realMeta, cardNumber: '5', player: 'Tarik Skubal', team: 'Detroit Tigers', rookie: false },
    { ...realMeta, cardNumber: '5', player: 'Ronel Blanco', team: 'Houston Astros', rookie: false },
    { ...realMeta, cardNumber: '5', player: 'Framber Valdez', team: 'Houston Astros', rookie: false },
  ];
  const realLeagueLeadersValidation = validateChecklist(realLeagueLeadersRows, realMeta);
  check(realLeagueLeadersValidation.duplicatePlayerCardCombos.length === 0, 'the REAL 2025 Topps Series 1 card #5 "League Leaders" trio (Tarik Skubal / Ronel Blanco / Framber Valdez, 3 different players sharing one real card number) produces zero duplicatePlayerCardCombos');
  check(realLeagueLeadersValidation.status === 'RELEASED', 'the REAL card #5 League Leaders trio, on its own, validates RELEASED - a legitimate shared card number never blocks it');

  const real2024Meta = { sport: 'baseball', year: '2024', manufacturer: 'Topps', brand: 'Topps', product: 'Topps Series 1', sourceType: 'manufacturer-checklist-pdf', sourceUrl: 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/MLB2401-2024ToppsSeries1BBChecklistV1.pdf' };
  const realArtifactRows = [
    { ...real2024Meta, cardNumber: '38', player: 'Pete Alonso', team: 'New York Mets', rookie: false, subset: 'Combo Card/Checklist' },
    { ...real2024Meta, cardNumber: '38', player: 'Pete Alonso', team: 'New York Mets', rookie: false, subset: 'Combo Cards' },
  ];
  const realArtifactValidation = validateChecklist(realArtifactRows, real2024Meta);
  check(realArtifactValidation.duplicatePlayerCardCombos.length === 1, 'the REAL 2024 Topps Series 1 card #38 true-duplicate artifact (Pete Alonso repeated under the same card number/team, only the subset text differs) is correctly flagged as a duplicatePlayerCardCombos anomaly - differing subset text alone does not let a true duplicate escape detection');
  check(realArtifactValidation.status !== 'RELEASED', 'the REAL card #38 true-duplicate artifact, on its own, is never marked RELEASED');

  // ---- 4. Team-alias normalization (without over-merging) ---------------------
  check(normalizeTeam('NY Yankees') === 'New York Yankees', 'NY Yankees normalizes to New York Yankees');
  check(normalizeTeam('KC Chiefs') === 'Kansas City Chiefs', 'KC Chiefs normalizes to Kansas City Chiefs');
  check(normalizeTeam('New York Yankees') === 'New York Yankees', 'an already-canonical team name passes through unchanged');
  check(normalizeTeam('LA Clippers') !== normalizeTeam('LA Lakers'), 'two distinct LA teams are never merged into one alias target');
  check(normalizeTeam('Some Made Up Team') === 'Some Made Up Team', 'an unknown team name is never silently rewritten - it passes through as-is rather than being guessed at');

  // ---- 5. Player-name safety (suffix/punctuation-safe, no identity merging) --
  check(normalizePlayerName('Bo Nix, JR') === 'Bo Nix Jr.', 'suffix punctuation is normalized (", JR" -> " Jr.")');
  check(playerIdentityKey('Bo Nix') !== playerIdentityKey('Bo Nix Jr.'), 'a player and their Jr./Sr. namesake are never collapsed into the same identity key');
  check(playerIdentityKey('José Ramírez') === playerIdentityKey('José Ramírez'.normalize('NFC')), 'accent-equivalent name spellings resolve to the same identity key');
  check(malformedNameReason('') === 'empty player name', 'empty player name is flagged as malformed');
  check(malformedNameReason('123') === 'player name is all digits', 'an all-digit "name" is flagged as malformed (likely a parse error)');
  check(malformedNameReason('Aaron Judge') === null, 'a well-formed real name is never flagged as malformed');

  // ---- 6. Card-count / status-calculation sanity -------------------------------
  const cleanRows = normalizeChecklist(
    [
      { cardNumber: '1', player: 'Clean Fixture One', team: 'Sample City Somethings', rookie: true },
      { cardNumber: '2', player: 'Clean Fixture Two', team: 'Placeholder Town Testers', rookie: false },
    ],
    meta
  ).rows;
  const cleanValidation = validateChecklist(cleanRows, { sourceUrl: meta.sourceUrl, sourceType: meta.sourceType, manufacturer: meta.manufacturer, sport: meta.sport, year: meta.year, product: meta.product, expectedCardCount: 2 });
  check(cleanValidation.status === 'RELEASED', `a clean, fully-verified, count-matched fixture set is marked RELEASED (got ${cleanValidation.status})`);
  const mismatchValidation = validateChecklist(cleanRows, { sourceUrl: meta.sourceUrl, sourceType: meta.sourceType, manufacturer: meta.manufacturer, sport: meta.sport, year: meta.year, product: meta.product, expectedCardCount: 500 });
  check(mismatchValidation.status !== 'RELEASED' && mismatchValidation.warnings.some((w) => w.includes('does not match expected count')), 'a parsed-count vs expected-count mismatch prevents a RELEASED status and is reported');
  const emptyValidation = validateChecklist([], { sourceUrl: meta.sourceUrl, sourceType: meta.sourceType, manufacturer: meta.manufacturer, sport: meta.sport, year: meta.year, product: meta.product });
  check(emptyValidation.status === 'NOT_READY', 'an empty checklist (e.g. from a blocked/failed fetch) is always NOT_READY, never RELEASED or PARTIAL');

  // ---- 7. Source traceability ---------------------------------------------------
  assert.throws(() => buildSourceMeta({ sourceType: 'manufacturer-checklist-page', manufacturer: 'Topps' }), /sourceUrl is required/, 'buildSourceMeta rejects missing sourceUrl');
  const sm = buildSourceMeta({ sourceUrl: 'https://www.topps.com/checklists', sourceType: 'manufacturer-checklist-page', manufacturer: 'Topps' });
  check(sm.sourceUrl && sm.sourceType && sm.parseDate, 'buildSourceMeta records sourceUrl/sourceType/parseDate for every product it covers');
  check(normTopps.every((r) => r.sourceUrl === meta.sourceUrl && r.sourceType === meta.sourceType), 'every normalized row carries its own source URL + type (row-level traceability, not just product-level)');

  // ---- 8. Real local HTTP fetch (fetch-source.js exercised for real, not mocked) --
  const server = http.createServer((req, res) => {
    if (req.url === '/topps-fixture') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(TOPPS_FIXTURE);
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const fetched = await fetchSource(`http://127.0.0.1:${port}/topps-fixture`);
    check(fetched === TOPPS_FIXTURE, 'fetchSource performs a real HTTP GET and returns the exact response body (verified against a local loopback server, not a stub)');

    let threw = null;
    try {
      await fetchSource(`http://127.0.0.1:${port}/does-not-exist`);
    } catch (e) {
      threw = e;
    }
    check(threw instanceof NetworkBlockedError, 'fetchSource surfaces a non-2xx response as a clearly-typed NetworkBlockedError instead of resolving with an empty/placeholder body');

    let dnsThrew = null;
    try {
      await fetchSource('https://this-host-does-not-exist.invalid.cardstorm-test/', { timeoutMs: 5000 });
    } catch (e) {
      dnsThrew = e;
    }
    check(dnsThrew instanceof NetworkBlockedError, 'fetchSource surfaces an unreachable host as NetworkBlockedError (the same failure mode confirmed for topps.com/panini.com from this sandbox)');

    // ---- end-to-end ingestTopps() against the local fixture server --------------
    const e2e = await ingestTopps(`http://127.0.0.1:${port}/topps-fixture`, meta);
    check(e2e.networkOk === true, 'ingestTopps end-to-end run succeeds against a real (loopback) HTTP source');
    check(e2e.rows.length === toppsRows.length - exclTopps.length, 'ingestTopps end-to-end row count is internally consistent with the parse+normalize step run separately (validation only flags rows, it never removes them)');
    check(e2e.validation.status !== 'RELEASED', 'ingestTopps end-to-end correctly downgrades status given the fixture\'s intentional TRUE-duplicate (card #6) and malformed (empty-name) rows');
  } finally {
    server.close();
  }

  // ---- 9. ingestPanini honest failure against a genuinely unreachable host ----
  const paniniFail = await ingestPanini('https://this-host-does-not-exist.invalid.cardstorm-test/', meta);
  check(paniniFail.networkOk === false && !!paniniFail.reason, 'ingestPanini reports networkOk:false with a reason on an unreachable source - it never fabricates rows to paper over a failed fetch');

  // ---- 10. Registry / SPORTS-YEARS single-source-of-truth (2026-27 readiness) --
  const appHtml = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const sportsMatch = appHtml.match(/const SPORTS=\[([^\]]*)\]/);
  const yearsMatch = appHtml.match(/YEARS=\[([^\]]*)\]/);
  check(!!sportsMatch && !!yearsMatch, 'app.html defines a single SPORTS/YEARS constant the checklist registry can be checked against');
  if (sportsMatch && yearsMatch) {
    const appSports = sportsMatch[1].split(',').map((s) => s.trim().replace(/'/g, ''));
    const appYears = yearsMatch[1].split(',').map((s) => s.trim().replace(/'/g, ''));
    check(JSON.stringify(appSports) === JSON.stringify(registry.SPORTS), `scripts/checklists/registry.js SPORTS matches app.html's SPORTS constant (${JSON.stringify(registry.SPORTS)})`);
    check(JSON.stringify(appYears) === JSON.stringify(registry.YEARS), `scripts/checklists/registry.js YEARS matches app.html's YEARS constant (${JSON.stringify(registry.YEARS)})`);
  }
  check(registry.YEARS.length === new Set(registry.YEARS).size, 'registry.js YEARS has no duplicate years');

  // ---- 11. Product-to-checklist linkage (Team Hunt): every RELEASED/PARTIAL --
  //          CHECKLIST_MANIFEST entry's file must actually exist on disk.
  const manifestBlockMatch = appHtml.match(/const CHECKLIST_MANIFEST=\{([\s\S]*?)\n\};/);
  check(!!manifestBlockMatch, 'app.html defines CHECKLIST_MANIFEST (the Team Hunt checklist data layer)');
  if (manifestBlockMatch) {
    const fileRefs = [...manifestBlockMatch[1].matchAll(/file:'([^']+)'/g)].map((m) => m[1]);
    check(fileRefs.length > 0, `CHECKLIST_MANIFEST references ${fileRefs.length} checklist data file(s)`);
    const missing = fileRefs.filter((f) => !fs.existsSync(path.join(ROOT, f)));
    check(missing.length === 0, missing.length ? `CHECKLIST_MANIFEST references missing file(s): ${missing.join(', ')}` : 'every CHECKLIST_MANIFEST file: reference resolves to a real file on disk (Team Hunt can never point at a missing checklist)');

    // ---- 12. Real live-ingested baseball checklist data (all 17 products, ---
    //          2024/2025/2026) - every real checklist file actually written
    //          this round: valid JSON, source-traced, and its own claimed
    //          validation status reproduces for real when re-run through
    //          validate-checklist.js right now (not just trusted from when
    //          it was written). Discovered dynamically from disk, not
    //          hardcoded to a fixed list, so this test automatically covers
    //          whatever real baseball products are actually persisted.
    const baseballDir = path.join(ROOT, 'data/checklists/baseball');
    const baseballFiles = [];
    fs.readdirSync(baseballDir).forEach((yr) => {
      const yrDir = path.join(baseballDir, yr);
      if (!fs.statSync(yrDir).isDirectory()) return;
      fs.readdirSync(yrDir).filter((f) => f.endsWith('.json')).forEach((f) => {
        baseballFiles.push([yr, `data/checklists/baseball/${yr}/${f}`]);
      });
    });
    check(baseballFiles.length >= 17, `at least 17 real baseball checklist files are persisted in the repo (found ${baseballFiles.length})`);
    let judgeFoundIn = [];
    let totalBaseballRows = 0;
    let releasedCount = 0;
    baseballFiles.forEach(([yr, relPath]) => {
      const filePath = path.join(ROOT, relPath);
      check(fs.existsSync(filePath), `real live-ingested checklist file exists: ${relPath}`);
      if (!fs.existsSync(filePath)) return;
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      check(!!raw.product && Array.isArray(raw.product.source.sourceURLs) && raw.product.source.sourceURLs[0].startsWith('https://cdn.shopify.com/'), `${relPath} carries a real source URL (cdn.shopify.com, Topps's own checklist-PDF CDN) - not fabricated`);
      const baseCards = (raw.categories['Base Set'] || {}).cards || [];
      const rookieCards = (raw.categories['Rookie Cards'] || {}).cards || [];
      const allCards = baseCards.concat(rookieCards);
      totalBaseballRows += allCards.length;
      check(allCards.length > 100, `${relPath} has a real, substantial row count (${allCards.length} cards) - not a trivial/placeholder file`);
      const asNormalized = allCards.map((c) => ({ sport: 'baseball', year: yr, manufacturer: 'Topps', brand: 'Topps', product: raw.product.set, cardNumber: c.cardNumber, player: c.player, team: c.team, rookie: c.rookie }));
      const reValidation = validateChecklist(asNormalized, { sourceUrl: raw.product.source.sourceURLs[0], sourceType: 'manufacturer-checklist-pdf', manufacturer: 'Topps', sport: 'baseball', year: yr, product: raw.product.set });
      check(reValidation.status === raw.product._validation.status, `${relPath}'s claimed validation status (${raw.product._validation.status}) reproduces for real when re-validated right now (got ${reValidation.status})`);
      if (reValidation.status === 'RELEASED') releasedCount++;
      const judge = allCards.find((c) => c.player === 'Aaron Judge' && c.team === 'New York Yankees');
      if (judge) judgeFoundIn.push(relPath);
    });
    check(judgeFoundIn.length >= 15, `a real Aaron Judge (New York Yankees) card was found in most/all of the real live-ingested baseball files (found in ${judgeFoundIn.length}/${baseballFiles.length})`);
    check(releasedCount >= 10, `most real baseball products genuinely validate RELEASED under the corrected duplicate-detection rule, not forced (${releasedCount}/${baseballFiles.length} RELEASED)`);
    ok(`Total real baseball checklist rows across all persisted files: ${totalBaseballRows}`);

    // ---- 13. Player page UX: real checklist cards lead, accent-safe match --
    check(/function playerNamesMatch\(/.test(appHtml), 'app.html defines playerNamesMatch(), an accent/case-insensitive player-name comparator');
    check(/const fold=\(s\)=>String\(s\)\.normalize\('NFD'\)/.test(appHtml), 'playerNamesMatch folds accents (e.g. roster "Ronald Acuna Jr." matches a real checklist row spelled "Ronald Acuña Jr.") without fuzzy/partial matching');
    check(appHtml.includes('if(!playerNamesMatch(rec.player,player))return;'), 'scanProductForPlayer (VERIFIED CHASE CARDS) uses the accent-safe comparator, not a brittle exact string match');
    check(appHtml.includes('const mine=(cards||[]).filter(c=>playerNamesMatch(c.player,player));'), 'playerChecklistCardsHTML (VERIFIED CHECKLIST CARDS) uses the accent-safe comparator too');
    const renderPlayerHuntMatch = appHtml.match(/function renderPlayerHunt\(ab,i\)\{[\s\S]*?\n\}/);
    check(!!renderPlayerHuntMatch, 'app.html defines renderPlayerHunt()');
    if (renderPlayerHuntMatch) {
      const body = renderPlayerHuntMatch[0];
      const checklistIdx = body.indexOf('>VERIFIED CHECKLIST CARDS<');
      const valuesIdx = body.indexOf('>VALUES<');
      const chaseIdx = body.indexOf('>VERIFIED CHASE CARDS<');
      check(checklistIdx !== -1 && valuesIdx !== -1 && chaseIdx !== -1, 'the player page renders all 3 real-data sections (checklist, values, chase)');
      check(checklistIdx < valuesIdx && valuesIdx < chaseIdx, 'the player page orders real data as VERIFIED CHECKLIST CARDS, then VALUES, then VERIFIED CHASE CARDS - a player with real checklist rows but no chase-type record no longer leads with a dominant empty chase block');
    }
  }

  if (failures) {
    console.error(`\n${failures} checklist-ingestion test(s) failed.`);
    process.exit(1);
  }
  console.log('\nALL CHECKLIST-INGESTION TESTS PASSED');
})().catch((err) => {
  console.error('FAIL - unexpected exception:', err);
  process.exit(1);
});
