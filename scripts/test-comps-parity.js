#!/usr/bin/env node
// Proves the backend's server-side comp lookup returns the exact same
// records the frontend's client-side COMPS constant has for a known
// player - no duplication drift, no independently-fabricated data.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const cardstormData = require("../api/lib/cardstormData");

const html = fs.readFileSync(path.join(__dirname, "..", "app.html"), "utf8");
const m = /const COMPS=(\[[\s\S]*?\]\]);/.exec(html);
// eslint-disable-next-line no-eval
const frontendComps = eval(m[1]);
const frontendHunterComps = frontendComps.filter((c) => c[0] === "Travis Hunter");

assert.ok(frontendHunterComps.length > 0, "expected Travis Hunter to have frontend comps to compare against");

const { matchedComps } = cardstormData.lookup("What has Travis Hunter sold for recently?");
const backendHunterComps = matchedComps.filter((c) => c[0] === "Travis Hunter");

assert.strictEqual(
  JSON.stringify(backendHunterComps),
  JSON.stringify(frontendHunterComps),
  "backend Travis Hunter comps must exactly match the frontend COMPS records"
);

console.log(
  `OK - backend cardstormData.lookup() returns the identical ${backendHunterComps.length} Travis Hunter comp record(s) the frontend COMPS constant has. No drift.`
);
