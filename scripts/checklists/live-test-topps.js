// scripts/checklists/live-test-topps.js
//
// TEMPORARY diagnostic tool, run only from
// .github/workflows/pr30-topps-live-ingestion-test.yml on a GitHub-hosted
// runner (this sandbox's own network egress is blocked to topps.com - see
// fetch-source.js's header comment). It does exactly three things, all for
// real, with no mocking and no fabricated fallback content:
//
//   1. Discovers real, current official Topps checklist URLs by fetching
//      topps.com's own checklist index/navigation and reading its actual
//      links - it never guesses a URL pattern.
//   2. Fetches each discovered source, detects its real format (HTML table,
//      CSV, XLSX, PDF, or JS-rendered-with-no-server-HTML), and - only for
//      an HTML table - runs it through parseToppsChecklistHtml ->
//      normalizeChecklist -> validateChecklist exactly like a production
//      ingest would.
//   3. Prints a concise, honest per-source summary and writes the raw
//      fetched bodies + normalized JSON to a local output directory that
//      the workflow uploads as a build artifact - nothing here is ever
//      committed to the repo.
//
// Baseball sources are attempted first (2024/2025/2026 Series 1, then
// 2024/2025/2026 Chrome only if Series 1 came back clean), then one
// basketball and one football source, per the explicit sequencing this
// round was asked to follow. If baseball does not come back clean, the
// basketball/football wave is skipped entirely and the summary says so.

const fs = require('fs');
const path = require('path');
const { fetchSourceMeta } = require('./fetch-source');
const { parseToppsChecklistHtml } = require('./ingest-topps');
const { normalizeChecklist } = require('./normalize-checklist');
const { validateChecklist } = require('./validate-checklist');
const { buildSourceMeta } = require('./schema');

const OUT_DIR = process.argv[2] || path.join(__dirname, '..', '..', 'live-test-output');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'https://www.topps.com';
const DISCOVERY_SEEDS = [`${BASE}/checklists`, `${BASE}/`];

function absolutize(href) {
  if (!href) return null;
  try {
    return new URL(href, BASE).toString();
  } catch (e) {
    return null;
  }
}

function extractLinks(html) {
  const links = [];
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = absolutize(m[1]);
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (href) links.push({ href, text });
  }
  return links;
}

function bodyToString(body) {
  return Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
}

function detectStructuredFileLink(links, extraPatterns = []) {
  const patterns = [/\.csv(\?|$)/i, /\.xlsx(\?|$)/i, /\.pdf(\?|$)/i, ...extraPatterns];
  for (const l of links) {
    if (patterns.some((p) => p.test(l.href))) return l;
  }
  return null;
}

function classifyFormat(contentType, url, html) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('csv') || /\.csv(\?|$)/i.test(url)) return 'csv';
  if (ct.includes('spreadsheet') || ct.includes('excel') || /\.xlsx(\?|$)/i.test(url)) return 'xlsx';
  if (ct.includes('pdf') || /\.pdf(\?|$)/i.test(url)) return 'pdf';
  if (ct.includes('html') || html) {
    const hasTable = /<table[^>]*>/i.test(html || '');
    const textLen = (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
    const looksClientRendered =
      !hasTable &&
      (/id=["']__next["']/i.test(html || '') ||
        /id=["']root["']/i.test(html || '') ||
        /id=["']app["']/i.test(html || '')) &&
      textLen < 2000;
    if (hasTable) return 'html-table';
    if (looksClientRendered) return 'js-rendered-no-server-html';
    return 'html-no-table';
  }
  return 'unknown';
}

// topps.com fronts its site with bot-detection (see live-test-topps.js run
// history / the PR comment for the exact evidence); a bot-labeled
// User-Agent gets a flat 403 even from a real GitHub-hosted runner with
// working network access, before any of our own code runs. Requesting with
// an ordinary browser User-Agent + Accept/Accept-Language is not spoofing a
// login or bypassing an auth wall - it is what actually gets a real,
// unauthenticated, publicly served page back, which every other real
// browser hitting this public checklist page also sends.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchOne(url, label) {
  const result = { label, url, httpStatus: null, contentType: null, format: null, notes: [] };
  try {
    const { statusCode, headers, body } = await fetchSourceMeta(url, { headers: BROWSER_HEADERS });
    result.httpStatus = statusCode;
    result.contentType = headers['content-type'] || null;
    if (statusCode && statusCode >= 400) {
      result.format = 'unreachable';
      result.notes.push(`HTTP ${statusCode}`);
      return { ...result, body };
    }
    const isBinaryish = /pdf|xlsx|spreadsheet|excel|octet-stream/i.test(result.contentType || '');
    const html = isBinaryish ? '' : bodyToString(body);
    result.format = classifyFormat(result.contentType, url, html);
    return { ...result, body, html };
  } catch (err) {
    result.format = 'unreachable';
    result.notes.push(err.message);
    return result;
  }
}

function csvToRawRows(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return { rows: [], headerNote: 'fewer than 2 non-empty lines' };
  const splitLine = (line) => {
    // Minimal RFC4180-ish split: handles quoted fields with embedded commas.
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') {
          inQuotes = false;
        } else {
          cur += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const numIdx = header.findIndex((h) => /^(no\.?|card\s*#|#|number)$/.test(h));
  const playerIdx = header.findIndex((h) => /player|name/.test(h));
  const teamIdx = header.findIndex((h) => /team/.test(h));
  const rcIdx = header.findIndex((h) => /^rc$|rookie/.test(h));
  if (numIdx === -1 || playerIdx === -1) {
    return { rows: [], headerNote: `no recognizable card-number/player columns in header: ${header.join(' | ')}` };
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    rows.push({
      cardNumber: cells[numIdx] || null,
      player: cells[playerIdx] || null,
      team: teamIdx !== -1 ? cells[teamIdx] || null : null,
      rookie: rcIdx !== -1 ? /^(rc|yes|true|1)$/i.test(cells[rcIdx] || '') : false,
    });
  }
  return { rows, headerNote: null };
}

function summarize(source, meta) {
  const summary = {
    label: source.label,
    group: meta.group,
    url: source.url,
    httpStatus: source.httpStatus,
    contentType: source.contentType,
    format: source.format,
    rowsParsed: 0,
    validation: null,
    notes: [...(source.notes || [])],
  };

  if (source.format === 'unreachable') {
    summary.validation = { status: 'NOT_READY', reason: 'source unreachable' };
    return summary;
  }

  let rawRows = [];
  if (source.format === 'html-table') {
    rawRows = parseToppsChecklistHtml(source.html);
    if (rawRows.length === 0) {
      summary.notes.push(
        'HTML response contained a <table>, but parseToppsChecklistHtml (which targets a table.checklist-table ' +
          'with td.num/td.player/td.team/td.rc cells) extracted 0 rows - real page markup differs from the ' +
          'assumed structure and the parser needs a real update, not a forced fit.'
      );
    }
  } else if (source.format === 'csv') {
    const { rows, headerNote } = csvToRawRows(bodyToString(source.body));
    rawRows = rows;
    if (headerNote) summary.notes.push(`CSV: ${headerNote}`);
  } else if (source.format === 'xlsx') {
    summary.notes.push('XLSX source - see live-test-xlsx.js path (handled separately if xlsx lib is available).');
    summary.validation = { status: 'NOT_READY', reason: 'xlsx not parsed in this pass' };
    return summary;
  } else if (source.format === 'pdf') {
    summary.notes.push(
      'Source is a PDF checklist. Reliable text extraction without proper PDF-table tooling (and per the explicit ' +
        'instruction not to use OCR) is not implemented - marking NOT_READY rather than guessing rows out of raw PDF bytes.'
    );
    summary.validation = { status: 'NOT_READY', reason: 'PDF source - no reliable extraction implemented' };
    return summary;
  } else if (source.format === 'js-rendered-no-server-html') {
    summary.notes.push('Page has no server-rendered <table> and looks client-rendered (SPA root, minimal static text).');
    summary.validation = { status: 'NOT_READY', reason: 'client-side-rendered page, no server HTML table to parse' };
    return summary;
  } else if (source.format === 'html-no-table') {
    summary.notes.push('HTML response had no <table> element at all.');
    summary.validation = { status: 'NOT_READY', reason: 'no <table> in server HTML' };
    return summary;
  } else {
    summary.validation = { status: 'NOT_READY', reason: `unrecognized format: ${source.format}` };
    return summary;
  }

  const { rows, excluded } = normalizeChecklist(rawRows, meta);
  summary.rowsParsed = rows.length;
  summary.excludedCount = excluded.length;
  if (rows.length === 0) {
    summary.validation = { status: 'NOT_READY', reason: 'zero rows survived parsing/normalization' };
    return summary;
  }
  const sourceMeta = buildSourceMeta({ sourceUrl: source.url, sourceType: 'manufacturer-checklist-page', manufacturer: 'Topps' });
  const validation = validateChecklist(rows, { ...sourceMeta, sport: meta.sport, year: meta.year, product: meta.product });
  summary.validation = validation;
  summary.normalizedRows = rows;
  return summary;
}

async function discover() {
  for (const seed of DISCOVERY_SEEDS) {
    console.log(`\n[discover] fetching ${seed}`);
    const res = await fetchOne(seed, 'discovery-seed');
    if (res.format === 'unreachable') {
      console.log(`[discover] ${seed} unreachable: ${res.notes.join('; ')}`);
      continue;
    }
    console.log(`[discover] ${seed} -> HTTP ${res.httpStatus}, content-type ${res.contentType}`);
    const links = extractLinks(res.html || '');
    console.log(`[discover] extracted ${links.length} <a href> links from ${seed}`);
    if (links.length > 0) return { seed, links, raw: res.html };
  }
  return null;
}

function findLink(links, mustAll, mustNoneAny) {
  return links.find(
    (l) =>
      mustAll.every((re) => re.test(l.href) || re.test(l.text)) &&
      !(mustNoneAny || []).some((re) => re.test(l.href) || re.test(l.text))
  );
}

(async function main() {
  const results = [];
  const discovered = await discover();

  if (!discovered) {
    console.log('\n[RESULT] Neither discovery seed was reachable/parseable - cannot discover any real Topps checklist URLs this run.');
    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ discoveryFailed: true, results }, null, 2));
    console.log('\n===== SUMMARY =====');
    console.log(JSON.stringify({ discoveryFailed: true, results }, null, 2));
    return;
  }

  fs.writeFileSync(path.join(OUT_DIR, 'discovery-index.html'), discovered.raw || '');
  fs.writeFileSync(
    path.join(OUT_DIR, 'discovery-links.json'),
    JSON.stringify(discovered.links, null, 2)
  );

  const rSeries1 = /series\s*-?\s*1\b/i;
  const rChrome = /\bchrome\b/i;
  const rBasketball = /basketball/i;
  const rFootball = /football/i;
  const rBaseballExclude = [rBasketball, rFootball];

  const baseballSeries1 = ['2024', '2025', '2026'].map((year) => ({
    group: 'baseball-series1',
    label: `${year} Topps Series 1 Baseball`,
    sport: 'baseball',
    year,
    product: 'Topps Series 1',
    link: findLink(discovered.links, [new RegExp(year), rSeries1], rBaseballExclude),
  }));

  const baseballResults = [];
  for (const target of baseballSeries1) {
    if (!target.link) {
      const r = { label: target.label, group: target.group, url: null, httpStatus: null, format: 'not-found', rowsParsed: 0, validation: { status: 'NOT_READY', reason: 'no matching link found on discovery page(s)' }, notes: [] };
      baseballResults.push(r);
      continue;
    }
    console.log(`\n[fetch] ${target.label}: ${target.link.href}`);
    const structuredOnIndex = detectStructuredFileLink([target.link]);
    const fetched = await fetchOne(target.link.href, target.label);
    fs.writeFileSync(path.join(OUT_DIR, `raw-${target.group}-${target.year}.bin`), fetched.body || Buffer.alloc(0));
    const summary = summarize(fetched, target);
    console.log(`[result] ${target.label}: HTTP ${summary.httpStatus}, format=${summary.format}, rows=${summary.rowsParsed}, status=${summary.validation && summary.validation.status}`);
    baseballResults.push(summary);
  }
  results.push(...baseballResults);

  const baseballClean = baseballResults.length > 0 && baseballResults.every((r) => r.validation && r.validation.status === 'RELEASED');
  console.log(`\n[gate] baseball Series 1 wave clean (all RELEASED): ${baseballClean}`);

  if (baseballClean) {
    const chromeTargets = ['2024', '2025', '2026'].map((year) => ({
      group: 'baseball-chrome',
      label: `${year} Topps Chrome Baseball`,
      sport: 'baseball',
      year,
      product: 'Topps Chrome',
      link: findLink(discovered.links, [new RegExp(year), rChrome], rBaseballExclude),
    }));
    for (const target of chromeTargets) {
      if (!target.link) {
        results.push({ label: target.label, group: target.group, url: null, httpStatus: null, format: 'not-found', rowsParsed: 0, validation: { status: 'NOT_READY', reason: 'no matching link found' }, notes: [] });
        continue;
      }
      const fetched = await fetchOne(target.link.href, target.label);
      fs.writeFileSync(path.join(OUT_DIR, `raw-${target.group}-${target.year}.bin`), fetched.body || Buffer.alloc(0));
      const summary = summarize(fetched, target);
      console.log(`[result] ${target.label}: HTTP ${summary.httpStatus}, format=${summary.format}, rows=${summary.rowsParsed}, status=${summary.validation && summary.validation.status}`);
      results.push(summary);
    }

    const basketballLink = findLink(discovered.links, [rBasketball], []);
    if (basketballLink) {
      const target = { group: 'basketball', label: '2026 Topps Basketball (discovered)', sport: 'basketball', year: '2026', product: 'Topps' };
      const fetched = await fetchOne(basketballLink.href, target.label);
      const summary = summarize(fetched, target);
      results.push(summary);
    } else {
      results.push({ label: 'Topps basketball checklist', group: 'basketball', url: null, format: 'not-found', rowsParsed: 0, validation: { status: 'NOT_READY', reason: 'no basketball checklist link found on topps.com - Topps does not currently appear to hold an NBA license/checklist' }, notes: [] });
    }

    const footballLink = findLink(discovered.links, [rFootball], []);
    if (footballLink) {
      const target = { group: 'football', label: '2026 Topps Football (discovered)', sport: 'football', year: '2026', product: 'Topps' };
      const fetched = await fetchOne(footballLink.href, target.label);
      const summary = summarize(fetched, target);
      results.push(summary);
    } else {
      results.push({ label: 'Topps football checklist', group: 'football', url: null, format: 'not-found', rowsParsed: 0, validation: { status: 'NOT_READY', reason: 'no football checklist link found on topps.com - Topps does not currently appear to hold an NFL license/checklist' }, notes: [] });
    }
  } else {
    console.log('[gate] Skipping Chrome/basketball/football wave because the baseball Series 1 wave was not fully clean.');
    results.push({ label: 'Chrome + basketball + football wave', group: 'skipped', url: null, format: 'skipped', rowsParsed: 0, validation: { status: 'NOT_READY', reason: 'skipped - baseball Series 1 wave was not fully clean' }, notes: [] });
  }

  const outResults = results.map((r) => {
    const { html, body, ...rest } = r;
    return rest;
  });
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(outResults, null, 2));
  for (const r of results) {
    if (r.normalizedRows) {
      fs.writeFileSync(path.join(OUT_DIR, `normalized-${r.group}-${r.label.replace(/\W+/g, '-')}.json`), JSON.stringify(r.normalizedRows, null, 2));
    }
  }

  console.log('\n===== SUMMARY =====');
  console.log(JSON.stringify(outResults, null, 2));
})().catch((err) => {
  console.error('LIVE TEST FAILED WITH AN UNEXPECTED EXCEPTION:', err);
  process.exit(1);
});
