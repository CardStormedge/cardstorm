// Headless-browser route-CORRECTNESS check, built on top of scripts/test-route-integrity.js.
//
// test-route-integrity.js is a static check: it proves every show('x') call site resolves to a
// real F[x] entry. That is necessary but not sufficient - a route can "exist" and still be wrong
// (the exact "all TCG set cards open the same set" class of bug the launch-readiness pass was
// asked to hunt for). This script actually launches Chromium, clicks through the real DOM, and
// asserts the destination CONTENT matches what was clicked, plus a couple of the other
// launch-blocking guarantees called out in that pass:
//   1. Every distinct TCG set card (Pokémon / TCG) opens ITS OWN set-intelligence page, not a
//      shared fallback - checked by clicking each card and asserting the h1 equals that card's
//      own name, not just "a page rendered".
//   2. Team Hunt -> a real team -> a real player -> that team's checklist all resolve to
//      correctly-titled pages (not a silent fallback to Team Hunt).
//   3. None of the flows above trigger a native alert()/confirm()/prompt() dialog - those make
//      the product feel unfinished and were a named launch blocker.
//
// Requires Playwright + a locally reachable copy of the built site. Skips (exit 0) rather than
// failing CI if Playwright's Chromium isn't installed, since scripts/test-route-integrity.js
// already covers the dependency-free static guarantee and this is a stricter, optional layer on
// top of it.
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PORT = 8934 + (process.pid % 1000);

function startServer() {
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const full = path.join(ROOT, p);
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(full, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': mime[path.extname(full)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.log('SKIP - playwright not installed; static route-integrity check already ran.');
    return;
  }
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].filter(Boolean);
  let executablePath;
  for (const c of candidates) { if (fs.existsSync(c)) { executablePath = c; break; } }

  const server = await startServer();
  const BASE = `http://localhost:${PORT}`;
  let failures = 0;
  const fail = (m) => { failures++; console.error('FAIL - ' + m); };
  const ok = (m) => console.log('OK - ' + m);

  let browser;
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {});
  } catch (e) {
    console.log('SKIP - could not launch Chromium (' + e.message.split('\n')[0] + '); static route-integrity check already ran.');
    server.close();
    return;
  }

  const dialogs = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // ---- 1. TCG set-card routing: every card must open ITS OWN set page ----
  const first = await ctx.newPage();
  first.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.dismiss(); });
  await first.goto(BASE + '/app.html#pokemon', { waitUntil: 'domcontentloaded' });
  await first.waitForSelector('.pokeSetCard', { timeout: 15000 }).catch(() => {});
  const setNames = await first.$$eval('.pokeSetCard h3', (els) => els.map((e) => e.textContent)).catch(() => []);
  await first.close();
  if (setNames.length < 2) {
    fail(`expected 2+ distinct TCG set cards on #pokemon, found ${setNames.length}`);
  } else {
    const seenTitles = new Set();
    for (let i = 0; i < setNames.length; i++) {
      const p = await ctx.newPage();
      p.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.dismiss(); });
      await p.goto(BASE + '/app.html#pokemon', { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.pokeSetCard');
      await p.evaluate((idx) => document.querySelectorAll('.pokeSetCard')[idx].click(), i);
      await p.waitForTimeout(150);
      const h1 = await p.$eval('h1', (el) => el.textContent).catch(() => null);
      await p.close();
      if (h1 !== setNames[i]) fail(`TCG set card ${i} ("${setNames[i]}") opened the wrong page (h1: "${h1}")`);
      else if (seenTitles.has(h1)) fail(`TCG set card ${i} ("${setNames[i]}") opened a page already opened by a different card - all sets funneling to one fallback`);
      else seenTitles.add(h1);
    }
    if (failures === 0) ok(`all ${setNames.length} TCG set cards open their own distinct, correctly-titled set page: ${setNames.join(' | ')}`);
  }

  // ---- 2. Team Hunt -> Yankees -> a player -> team checklist, content-verified ----
  const tp = await ctx.newPage();
  tp.on('dialog', async (d) => { dialogs.push(d.type() + ': ' + d.message()); await d.dismiss(); });
  await tp.goto(BASE + '/app.html#team', { waitUntil: 'domcontentloaded' });
  await tp.waitForSelector('.teamcard');
  await tp.evaluate(() => {
    const btn = [...document.querySelectorAll('.tabs button')].find((b) => /BASEBALL/i.test(b.textContent));
    if (btn) btn.click();
  });
  await tp.waitForTimeout(150);
  const teamNames = await tp.$$eval('.teamcard .teamname', (els) => els.map((e) => e.textContent));
  const yIdx = teamNames.findIndex((t) => /Yankees/i.test(t));
  if (yIdx < 0) {
    fail('New York Yankees not found in the baseball Team Hunt grid');
  } else {
    await tp.evaluate((idx) => document.querySelectorAll('.teamcard')[idx].click(), yIdx);
    await tp.waitForTimeout(200);
    const teamH1 = await tp.$eval('h1', (el) => el.textContent).catch(() => null);
    if (teamH1 !== 'New York Yankees') fail(`Yankees team card opened "${teamH1}" instead of the Yankees page`);
    else ok('Team Hunt -> Yankees opens the correct team page');
    const clicked = await tp.evaluate(() => {
      const els = [...document.querySelectorAll('#content *')];
      const el = els.find((e) => e.children.length === 0 && /Aaron Judge/i.test(e.textContent || ''));
      const target = el && el.closest('[onclick]');
      if (!target) return false;
      target.click();
      return true;
    });
    if (!clicked) {
      fail('Aaron Judge not clickable from the Yankees team page');
    } else {
      await tp.waitForTimeout(200);
      const playerH1 = await tp.$eval('h1', (el) => el.textContent).catch(() => null);
      if (playerH1 !== 'Aaron Judge') fail(`Aaron Judge card opened "${playerH1}" instead of his player page`);
      else ok('Yankees -> Aaron Judge opens the correct player page');
      const clicked2 = await tp.evaluate(() => {
        const btn = [...document.querySelectorAll('#content button')].find((b) => /VIEW .*CHECKLIST/i.test(b.textContent));
        if (!btn) return false;
        btn.click();
        return true;
      });
      if (!clicked2) {
        fail('No team-specific "VIEW ... CHECKLIST" CTA found on the Aaron Judge player page');
      } else {
        await tp.waitForTimeout(200);
        const clH1 = await tp.$eval('h1', (el) => el.textContent).catch(() => null);
        if (!clH1 || !/Yankees/i.test(clH1)) fail(`Player checklist CTA opened "${clH1}" instead of a Yankees checklist page`);
        else ok(`Aaron Judge's checklist CTA correctly opens the Yankees checklist page ("${clH1}")`);
      }
    }
  }
  await tp.close();

  // ---- 3. No native dialogs anywhere in the flows above ----
  if (dialogs.length) fail(`native alert()/confirm()/prompt() fired during routing flows (feels unfinished, must be an in-app UI state instead): ${dialogs.join(' | ')}`);
  else ok('no native alert()/confirm()/prompt() dialogs fired during any of the above flows');

  await browser.close();
  server.close();

  if (failures) {
    console.error(`\n${failures} route-correctness check(s) failed.`);
    process.exit(1);
  }
  console.log('\nALL ROUTE-CORRECTNESS TESTS PASSED');
}

main().catch((e) => { console.error(e); process.exit(1); });
