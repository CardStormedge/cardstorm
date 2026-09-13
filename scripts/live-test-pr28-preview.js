// TEMPORARY diagnostic script for pr28-preview-smoke-test.yml - see that
// workflow file for context. Not part of permanent CI.
const https = require("https");

function req(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const r = https.request(
      u,
      {
        method,
        headers: {
          ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
        timeout: 30000,
      },
      (res) => {
        let chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") })
        );
      }
    );
    r.on("error", reject);
    r.on("timeout", () => r.destroy(new Error("timeout")));
    if (data) r.write(data);
    r.end();
  });
}

const FRONTEND_PREVIEW =
  process.env.FRONTEND_PREVIEW_URL ||
  "https://cardstorm-git-claude-launch-readiness-sweep-card-storm.vercel.app";
const BACKEND_PROD = "https://cardstorm-api.vercel.app/api/cardstorm";

const QUESTIONS = [
  "What makes Downtown inserts valuable?",
  "What has Travis Hunter sold for recently?",
  "Where can I find a Downtown insert?",
];

async function testFrontendPreview() {
  console.log("\n=== TASK 5: Frontend Vercel preview reachability ===");
  console.log("URL:", FRONTEND_PREVIEW);
  try {
    const res = await req(FRONTEND_PREVIEW + "/app.html");
    console.log("HTTP status:", res.status);
    const isProtection =
      res.status === 401 &&
      /Authentication Required|vercel/i.test(res.body || "");
    if (res.status === 200) {
      const hasTitle = /CardStorm/i.test(res.body);
      console.log("PASS - preview reachable, 200, CardStorm content present:", hasTitle);
    } else if (res.status === 401 || res.status === 403) {
      console.log("BLOCKED - Vercel Deployment Protection (SSO) is gating this preview URL.");
      console.log("First 500 chars of body:", (res.body || "").slice(0, 500));
    } else {
      console.log("UNEXPECTED status, first 500 chars of body:", (res.body || "").slice(0, 500));
    }
  } catch (e) {
    console.log("ERROR reaching frontend preview:", e.message);
  }
}

async function testBackend() {
  console.log("\n=== TASK 6: Live Ask CardStorm smoke test against production backend ===");
  console.log("URL:", BACKEND_PROD);
  for (const question of QUESTIONS) {
    console.log("\n--- Question:", question, "---");
    try {
      const res = await req(BACKEND_PROD, {
        method: "POST",
        headers: { Origin: "https://cardstormguide.com" },
        body: { question, conversation: [], images: {}, mode: "ask" },
      });
      console.log("HTTP status:", res.status);
      let parsed = null;
      try {
        parsed = JSON.parse(res.body);
      } catch (e) {
        console.log("FAIL - response body was not valid JSON. Raw (first 500 chars):", (res.body || "").slice(0, 500));
        continue;
      }
      if (res.status !== 200) {
        console.log("FAIL - non-200 response:", JSON.stringify(parsed).slice(0, 500));
        continue;
      }
      console.log("answerType:", parsed.answerType);
      console.log("answer (first 600 chars):", (parsed.answer || "").slice(0, 600));
      console.log("identifiedProducts:", JSON.stringify(parsed.identifiedProducts));
      console.log("identifiedPlayers:", JSON.stringify(parsed.identifiedPlayers));
      console.log("soldComps:", JSON.stringify(parsed.soldComps));
      console.log("warnings:", JSON.stringify(parsed.warnings));
    } catch (e) {
      console.log("ERROR calling backend:", e.message);
    }
  }
}

(async () => {
  await testFrontendPreview();
  await testBackend();
})();
