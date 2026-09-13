// Static link/route-integrity check for app.html's client-side router.
//
// app.html is a single-page app whose in-page router is a plain object (`F`) mapping route
// names to render functions, driven by `show('routeName')` calls sprinkled across nav bars,
// CTAs and drill-down links. Two classes of regression this guards against, both found and
// fixed during the launch-readiness sweep:
//
//   1. A dead route: some `show('x')` call site references a route name that never ends up
//      as a key on `F`, so navigating there silently falls back to the Team Hunt view
//      instead of the intended page (F[v]||team in show()).
//   2. The initial-hash bootstrap (`if(location.hash){...F[init]...}`) running before later
//      <script> blocks have populated `F` — which either silently rendered the wrong page or
//      threw a ReferenceError and left the page blank on a direct link / hard refresh to a
//      route defined later in the file (this exact bug hit #checks, #pokemon, #askcardstorm,
//      #legends and #goatlegacy). This script asserts that bootstrap is still gated behind
//      DOMContentLoaded rather than running as a synchronous top-level statement.
//
// This is intentionally a static text/regex check with no dependencies (no headless browser)
// so it runs anywhere `node` runs, including CI without Playwright installed.
const fs = require('fs');
const path = require('path');

const APP_HTML = path.join(__dirname, '..', 'app.html');
const src = fs.readFileSync(APP_HTML, 'utf8');

let failures = 0;
function fail(msg) { failures++; console.error('FAIL - ' + msg); }
function ok(msg) { console.log('OK - ' + msg); }

// ---- 1. Collect every route name referenced via show('name') ----
const showCalls = new Set();
for (const m of src.matchAll(/\bshow\(\s*'([a-zA-Z0-9_]+)'\s*\)/g)) showCalls.add(m[1]);
if (showCalls.size < 5) fail(`only found ${showCalls.size} show('...') call sites - route extraction likely broken`);
else ok(`found ${showCalls.size} distinct route names referenced via show(): ${[...showCalls].sort().join(', ')}`);

// ---- 2. Resolve the final set of keys on F: the initial object literal plus every
//         later `F.key = value;` reassignment (order doesn't matter for a static "does a
//         key exist by end of file" check). ----
const fLiteralMatch = src.match(/const F=\{([^}]*)\};/);
if (!fLiteralMatch) fail('could not find `const F={...}` route table literal');
const fKeys = new Set();
if (fLiteralMatch) {
  for (const key of fLiteralMatch[1].split(',').map(s => s.trim()).filter(Boolean)) fKeys.add(key);
}
for (const m of src.matchAll(/\bF\.([a-zA-Z0-9_]+)\s*=/g)) fKeys.add(m[1]);
ok(`route table F resolves to ${fKeys.size} keys by end of file: ${[...fKeys].sort().join(', ')}`);

// ---- 3. Every show('name') call site must resolve to a real F key ----
const deadRoutes = [...showCalls].filter(r => !fKeys.has(r));
if (deadRoutes.length) fail(`route(s) referenced via show() with no matching F entry (dead route - falls back to Team Hunt silently): ${deadRoutes.join(', ')}`);
else ok('every show()-referenced route resolves to a real F entry');

// ---- 4. The initial hash-bootstrap must not run synchronously before F is fully populated.
//         It must be gated behind DOMContentLoaded (or already-loaded readyState check). ----
const bootstrapMatch = src.match(/if\(location\.hash\)\{([\s\S]{0,2000}?)\}\nelse if\(!inCardStormFrame\(\)\)\{goHome\(\);\}/);
if (!bootstrapMatch) {
  fail('could not find the initial location.hash bootstrap block to verify it is deferred');
} else {
  const block = bootstrapMatch[1];
  if (!/DOMContentLoaded/.test(block)) {
    fail('initial hash bootstrap is not gated behind DOMContentLoaded - a direct link or hard refresh to a route defined later in app.html (e.g. #checks, #pokemon, #askcardstorm, #legends, #goatlegacy) can silently render the wrong page or throw a ReferenceError. See the fix applied for the launch-readiness sweep.');
  } else if (/^\s*setTimeout\(/.test(block.trim())) {
    fail('initial hash bootstrap uses setTimeout(fn,0) to defer - verified unreliable in this app: Chromium can run the timer callback mid-parse on a document this large, before later <script> blocks that populate F have executed. Use a DOMContentLoaded listener (with an already-loaded readyState fallback) instead.');
  } else {
    ok('initial hash bootstrap is deferred behind DOMContentLoaded, so F is fully populated before a direct link / hard refresh resolves its route');
  }
}

if (failures) {
  console.error(`\n${failures} route-integrity check(s) failed.`);
  process.exit(1);
}
console.log('\nALL ROUTE-INTEGRITY TESTS PASSED');
