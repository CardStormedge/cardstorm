#!/usr/bin/env node
// Guards against drift between app.html's inline COMPS/WATCHCAT constants
// (the frontend's fast local-match source) and data/intelligence/*.json
// (the same data, exposed so the serverless backend can read it too).
//
// These are intentionally two copies of the same data rather than one
// runtime-fetched source: app.html renders COMPS[0] synchronously on the
// very first paint (homepage MARKET RADAR tile), so switching it to an
// async fetch risked a broken/empty first render across the whole app.
// This script is the tradeoff's safety net - run it in CI or before any
// commit that touches either copy, so drift is caught immediately instead
// of silently diverging.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "app.html"), "utf8");

function extract(source, varName, closePattern) {
  const re = new RegExp(`const ${varName}=(\\[[\\s\\S]*?${closePattern});`);
  const m = re.exec(source);
  if (!m) throw new Error(`Could not find ${varName} in app.html`);
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}

const htmlComps = extract(html, "COMPS", "\\]\\]");
const htmlWatchcat = extract(html, "WATCHCAT", "\\]\\n\\]");

const jsonComps = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/intelligence/comps.json"), "utf8")
).comps;
const jsonWatchcat = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/intelligence/watchcat.json"), "utf8")
).watchcat;

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let ok = true;
if (!deepEqual(htmlComps, jsonComps)) {
  ok = false;
  console.error(
    `COMPS DRIFT: app.html has ${htmlComps.length} records, data/intelligence/comps.json has ${jsonComps.length}. Contents differ - regenerate the JSON from app.html (see git history for the extraction one-liner) before merging.`
  );
}
if (!deepEqual(htmlWatchcat, jsonWatchcat)) {
  ok = false;
  console.error(
    `WATCHCAT DRIFT: app.html has ${htmlWatchcat.length} records, data/intelligence/watchcat.json has ${jsonWatchcat.length}. Contents differ - regenerate the JSON from app.html before merging.`
  );
}

if (!ok) {
  process.exit(1);
}
console.log(
  `OK - COMPS (${htmlComps.length} records) and WATCHCAT (${htmlWatchcat.length} records) match exactly between app.html and data/intelligence/*.json.`
);
