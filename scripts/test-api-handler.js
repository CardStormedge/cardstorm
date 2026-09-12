#!/usr/bin/env node
// Exercises api/cardstorm.js directly (no real HTTP server, no network) to
// prove request validation, CORS origin handling, and the honest no-key
// fallback all work - without needing a live Anthropic API key.
const assert = require("assert");
const handler = require("../api/cardstorm");

function mockReqRes({ method = "POST", origin, body } = {}) {
  const headers = {};
  if (origin) headers.origin = origin;
  const req = { method, headers, body, socket: { remoteAddress: "127.0.0.1" } };
  const res = {
    statusCode: null,
    _headers: {},
    _json: null,
    setHeader(k, v) {
      this._headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this._json = obj;
      return this;
    },
    end() {
      return this;
    },
  };
  return { req, res };
}

async function run() {
  // 1. Approved production origin + valid question -> honest no-key answer.
  {
    const { req, res } = mockReqRes({
      origin: "https://cardstormguide.com",
      body: { question: "What rookies are hot?", conversation: [], images: {} },
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200, "expected 200 for a valid request from an allowed origin");
    assert.strictEqual(res._headers["Access-Control-Allow-Origin"], "https://cardstormguide.com");
    assert.strictEqual(res._json.answerType, "system_unavailable");
    assert.ok(/isn't connected yet/.test(res._json.answer), "expected honest not-connected answer, got: " + res._json.answer);
    console.log("OK - cardstormguide.com origin allowed, honest no-key fallback returned");
  }

  // 2. Also-approved stormguide.com origin (user-reported live domain).
  {
    const { req, res } = mockReqRes({
      origin: "https://stormguide.com",
      body: { question: "Is this rare?", conversation: [], images: {} },
    });
    await handler(req, res);
    assert.strictEqual(res._headers["Access-Control-Allow-Origin"], "https://stormguide.com");
    assert.strictEqual(res.statusCode, 200);
    console.log("OK - stormguide.com origin allowed");
  }

  // 3. Unapproved origin -> rejected.
  {
    const { req, res } = mockReqRes({
      origin: "https://evil-scraper.example",
      body: { question: "hi", conversation: [], images: {} },
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 403, "expected 403 for a disallowed origin");
    assert.strictEqual(res._headers["Access-Control-Allow-Origin"], undefined);
    console.log("OK - unapproved origin rejected with 403, no CORS header leaked");
  }

  // 4. Empty request -> 400 validation error, no crash.
  {
    const { req, res } = mockReqRes({
      origin: "https://cardstormguide.com",
      body: { question: "", conversation: [], images: {} },
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res._json.error, "expected a validation error message");
    console.log("OK - empty question + no images rejected with 400:", res._json.error);
  }

  // 5. Oversized question -> 400, not a crash / 500.
  {
    const { req, res } = mockReqRes({
      origin: "https://cardstormguide.com",
      body: { question: "x".repeat(5000), conversation: [], images: {} },
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 400);
    console.log("OK - oversized question rejected with 400");
  }

  // 6. Travis Hunter sold-comp question -> verified internal comps surfaced,
  // even without a live model call (grounding happens before the model
  // call and the no-key path still reports what it found).
  {
    const { req, res } = mockReqRes({
      origin: "https://cardstormguide.com",
      body: { question: "What has Travis Hunter sold for recently?", conversation: [], images: {} },
    });
    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(
      res._json.identifiedPlayers.includes("Travis Hunter"),
      "expected Travis Hunter to be identified from on-disk grounding even with no live model call"
    );
    console.log("OK - Travis Hunter grounded from data/intelligence/comps.json even without a live model call");
  }

  console.log("\nALL API HANDLER TESTS PASSED");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
