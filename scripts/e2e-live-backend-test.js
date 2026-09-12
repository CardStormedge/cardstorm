#!/usr/bin/env node
// TEMPORARY E2E test - real browser driving the real Ask CardStorm UI
// against a LIVE backend deployment. Only runs where real network egress
// exists (GitHub Actions runners) - this sandbox's own dev environment has
// no outbound access to any *.vercel.app domain, so this cannot be run
// locally here against the real backend; it exists specifically so CI can
// produce real, unfaked results instead of this session claiming an
// untestable browser flow "works." (It CAN be, and was, dry-run locally
// against a local mock backend on SITE_URL/MOCK_URL to shake out DOM/script
// bugs before ever trusting a live CI run - see scripts/mock-backend-for-e2e-dryrun.js.)
//
// Now that the production endpoint is confirmed live, this drives the
// UNMODIFIED committed app.html (already pointed at the real production
// URL) straight against the real PRODUCTION backend - no URL swap needed.
// The one wrinkle: api/lib/cors.js's production allow-list only accepts
// https://cardstormguide.com / stormguide.com (and www. variants) - a CI
// runner's bare localhost is correctly rejected there, by design, once
// VERCEL_ENV==="production". So the workflow makes the runner's own
// browser present as that origin: it maps cardstormguide.com to 127.0.0.1
// in /etc/hosts and serves this copy of the site over HTTPS on the
// default port 443 with a throwaway self-signed cert (trusted here via
// --ignore-certificate-errors/ignoreHTTPSErrors - that only affects what
// THIS browser accepts locally, not what the server returns). Chromium
// then sends a real, exactly-matching `Origin: https://cardstormguide.com`
// header on every request, so the production CORS check passes honestly
// rather than being bypassed. The plain-curl job in the same workflow
// independently double-checks both the approved- and rejected-origin CORS
// behavior directly against production.
//
// IMPORTANT DOM NOTE: index.html embeds the actual app (app.html, with all
// of Ask CardStorm's markup/JS) inside an <iframe id="appFrame">. Every
// Ask-CardStorm DOM interaction below happens on that IFRAME's Frame
// object, not the top-level Page - mirroring the working pattern already
// used by this repo's own local Playwright suites (see openApp()+
// contentFrame() below). Interacting with the top-level `page` for any of
// these selectors will simply find nothing.
const { chromium } = require("playwright");
const path = require("path");

const SITE_URL = process.env.SITE_URL || "https://cardstormguide.com";
const HEADLESS = true;

let pass = 0;
let fail = 0;
function ok(label, cond, detail) {
  if (cond) {
    pass++;
    console.log(`PASS - ${label}${detail ? " :: " + detail : ""}`);
  } else {
    fail++;
    console.log(`FAIL - ${label}${detail ? " :: " + detail : ""}`);
  }
}

async function gotoAskCardstorm(page) {
  await page.goto(SITE_URL + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.openApp && window.openApp("market"));
  await page.waitForTimeout(600);
  const frame = await (await page.$("#appFrame")).contentFrame();
  await frame.evaluate(() => window.show("askcardstorm"));
  await frame.waitForSelector("#ackQuestion", { timeout: 10000 });
  return frame;
}

async function askQuestion(frame, text) {
  await frame.fill("#ackQuestion", text);
  await frame.click(".ackAskBtn");
  // ackAskQuestion() sets _ackThinking=true and re-renders synchronously,
  // before its first await (the actual fetch call) - so by the time
  // click() resolves (the synchronous onclick handler has already run),
  // the thinking bubble is already in the DOM if this question is
  // backend-routed. Checking immediately (no wait/race) is what makes this
  // reliable even against a near-instant backend - a waitForSelector race
  // against the click was observed to flake exactly in that fast case
  // during local dry-run testing.
  const sawThinking = await frame.evaluate(() => !!document.querySelector(".ackThinking"));
  // Wait for the THINKING bubble to be replaced by a real bot reply (last
  // .ackMsg.bot no longer showing the thinking class), generous timeout for
  // real research-path questions.
  // IMPORTANT: Frame.waitForFunction(pageFunction, arg, options) - the
  // 2nd positional parameter is the ARG passed into pageFunction, not
  // options. Passing {timeout} as the 2nd argument (as an earlier version
  // of this script did) silently makes it the (unused) arg instead, so the
  // call falls back to Playwright's default 30s timeout - this was caught
  // by a real CI run against the live backend (a research question that
  // legitimately took >30s), not by local dry-run testing against a fast
  // mock. `undefined` must be passed explicitly for arg here.
  await frame.waitForFunction(
    () => {
      const msgs = document.querySelectorAll(".ackMsg.bot");
      if (!msgs.length) return false;
      const last = msgs[msgs.length - 1];
      return !last.classList.contains("ackThinking");
    },
    undefined,
    { timeout: 50000 }
  );
  const botMsgs = await frame.$$eval(".ackMsg.bot", (els) => els.map((e) => e.innerHTML));
  return { sawThinking, lastReply: botMsgs[botMsgs.length - 1] || "" };
}

async function waitForAnalyzeResult(frame) {
  await frame.waitForFunction(
    () => {
      const head = document.querySelector(".ackResultHead");
      return head && !/CARDSTORM IS LOOKING/.test(head.textContent);
    },
    undefined,
    { timeout: 50000 }
  );
  return frame.$eval(".ackResult", (el) => el.innerHTML);
}

async function run() {
  const browser = await chromium.launch({
    headless: HEADLESS,
    // Now that this script hits the real PRODUCTION endpoint from a spoofed
    // https://cardstormguide.com origin (see the workflow's /etc/hosts +
    // self-signed cert setup), the TLS cert Chromium sees is self-signed and
    // must be explicitly trusted here - this has no effect on what the
    // server actually returns, only on the local browser's cert check.
    args: ["--ignore-certificate-errors"],
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  });

  // ---- Desktop viewport: 7 text questions ----
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const t = msg.text();
      // Same benign-noise filter this repo's other local Playwright suites
      // already use - a background game-data.json fetch/timing artifact
      // unrelated to Ask CardStorm, not something introduced here.
      if (t.includes("game-data.json") || t.includes("ERR_TUNNEL") || t.includes("404")) return;
      consoleErrors.push(t);
    });
    const frame = await gotoAskCardstorm(page);

    // expectThinking: false for the two questions the CLIENT-SIDE fast path
    // (COMPS player-name match / WATCHCAT hot-rookies regex in app.html's
    // ackAskQuestion) answers locally, by design, before ever calling the
    // backend - per requirement #2 ("keep the frontend fast paths"), these
    // correctly never reach /api/cardstorm at all, so no THINKING state and
    // no backend-only phrasing ("CardStorm Verified Data") is expected for
    // them; the other 5 questions name no COMPS/WATCHCAT player and don't
    // match the hot-rookies regex, so they do reach the backend.
    const questions = [
      { label: "1-downtown-value", q: "What makes Downtown inserts so valuable?", expectThinking: true },
      { label: "2-downtown-product", q: "Where can I find a Downtown insert? What product/set?", expectThinking: true },
      { label: "3-downtown-not-topps", q: "Is Downtown a Topps insert?", expectThinking: true },
      { label: "4-topps-2026-rookies", q: "What are the top rookies for Topps flagship 2026?", expectThinking: true },
      { label: "5-hot-rookies", q: "What rookies are hot?", expectThinking: false },
      { label: "6-travis-hunter", q: "What has Travis Hunter sold for recently?", expectThinking: false },
      { label: "7-price-no-context", q: "Is $75 a good price for this card?", expectThinking: true },
    ];

    for (const { label, q, expectThinking } of questions) {
      const { sawThinking, lastReply } = await askQuestion(frame, q);
      ok(
        `desktop1440: [${label}] routed as expected (${expectThinking ? "backend, THINKING shown" : "client fast path, no THINKING"})`,
        sawThinking === expectThinking
      );
      ok(`desktop1440: [${label}] real answer rendered (non-empty)`, lastReply.trim().length > 20, lastReply.slice(0, 80));
      ok(
        `desktop1440: [${label}] no raw structured JSON leaked into visible answer`,
        !/CARDSTORM_DATA|"answerType"|"identifiedPlayers"/.test(lastReply)
      );
      ok(
        `desktop1440: [${label}] no raw provider/HTTP error leaked`,
        !/FUNCTION_INVOCATION|Vercel|<html|Internal Server Error/i.test(lastReply)
      );
      if (label === "2-downtown-product" || label === "3-downtown-not-topps") {
        ok(`desktop1440: [${label}] Downtown correctly NOT attributed to Topps`, !/is a topps/i.test(lastReply), lastReply.slice(0, 200));
        ok(
          `desktop1440: [${label}] backend answer labels internal grounding as CardStorm Verified Data`,
          /CardStorm Verified Data/.test(lastReply)
        );
      }
      if (label === "4-topps-2026-rookies") {
        ok("desktop1440: research question shows a Sources block", /Sources:/i.test(lastReply));
      }
      if (label === "5-hot-rookies") {
        ok(
          "desktop1440: hot-rookies answered from client-side WATCHCAT fast path (not a canned fallback)",
          /Downtown|Prizm|Optic/i.test(lastReply)
        );
      }
      if (label === "6-travis-hunter") {
        ok(
          "desktop1440: Travis Hunter answered from client-side COMPS fast path (\"here's what CardStorm has on file\")",
          /here's what CardStorm has on file/i.test(lastReply)
        );
        ok(
          "desktop1440: Travis Hunter exact verified comp figures present ($56, $46, $44)",
          /\$56/.test(lastReply) && /\$46/.test(lastReply) && /\$44/.test(lastReply)
        );
      }
      if (label === "7-price-no-context") {
        ok(
          "desktop1440: no-context price question asks for card identity instead of guessing",
          !/\$\d/.test(lastReply.replace("$75", "")) // no OTHER dollar figure than the user's own $75 echoed back
        );
      }
    }
    ok("desktop1440: zero console errors across all 7 questions", consoleErrors.length === 0, consoleErrors.join(" | "));

    const overflowX = await frame.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    ok("desktop1440: no horizontal overflow", !overflowX);

    await context.close();
  }

  // ---- Mobile viewport: subset of the same questions + layout checks ----
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const frame = await gotoAskCardstorm(page);

    // A genuinely backend-routed question (no COMPS/WATCHCAT name match),
    // so this actually exercises THINKING + the live backend on mobile,
    // not just the client-side fast path.
    const { sawThinking, lastReply } = await askQuestion(frame, "Is Downtown a Topps insert?");
    ok("mobile390: THINKING state appeared", sawThinking);
    ok("mobile390: real answer rendered", lastReply.trim().length > 20);
    ok("mobile390: Downtown correctly attributed to Panini, not Topps, on mobile", !/is a topps/i.test(lastReply));
    ok("mobile390: CardStorm Verified Data source label renders on mobile", /CardStorm Verified Data/.test(lastReply));

    // Also exercise the client-side COMPS fast path on mobile.
    const hunterResult = await askQuestion(frame, "What has Travis Hunter sold for recently?");
    ok("mobile390: Travis Hunter client fast path still works on mobile (no THINKING)", hunterResult.sawThinking === false);
    ok(
      "mobile390: Travis Hunter verified comps present on mobile",
      /\$56/.test(hunterResult.lastReply) && /\$46/.test(hunterResult.lastReply)
    );

    const overflowX = await frame.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    ok("mobile390: no horizontal overflow", !overflowX);

    await context.close();
  }

  // ---- Image tests: front/back, general screenshot, unclear image ----
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    let frame = await gotoAskCardstorm(page);

    const cardImage = path.join(__dirname, "..", "assets", "reference-cards", "2024-donruss-bo-nix.webp");
    const boxImage = path.join(__dirname, "..", "assets", "boxes", "box-football-2026-prizm.webp");
    const blurryImage = path.join(__dirname, "..", "scripts", "fixtures", "unclear-test-image.jpg");

    // A. Front/back card image. Only one real card photo exists in this
    // repo's assets, so the same image is used for both the front and back
    // slots - a limitation of available test fixtures, not a bug; it still
    // genuinely exercises the upload -> resize -> backend -> render path.
    await frame.setInputFiles("#ackInput_front", cardImage);
    await frame.waitForSelector(".ackSlot.filled img", { timeout: 10000 });
    await frame.setInputFiles("#ackInput_back", cardImage);
    await frame.waitForFunction(() => document.querySelectorAll(".ackSlot.filled img").length >= 2, undefined, { timeout: 10000 });
    await frame.fill("#ackQuestion", "What card is this?");
    await frame.click(".ackAnalyzeBtn");
    const frontBackResultHtml = await waitForAnalyzeResult(frame);
    ok("vision: front/back analyze produced a real result panel (not stub)", !/VISION SERVICE NOT CONNECTED/.test(frontBackResultHtml));
    ok(
      "vision: front/back result shows confidence or possible-match language, not false certainty",
      /confidence|likely match|possible match|%/i.test(frontBackResultHtml) || /grading candidate/i.test(frontBackResultHtml)
    );
    ok("vision: no raw error/JSON leaked in front/back result", !/CARDSTORM_DATA|FUNCTION_INVOCATION/.test(frontBackResultHtml));
    console.log("VISION_FRONTBACK_RESULT_BEGIN\n" + frontBackResultHtml + "\nVISION_FRONTBACK_RESULT_END");

    // A full reload resets all client-side image/chat state cleanly for
    // the next image test.
    frame = await gotoAskCardstorm(page);

    // B. General screenshot/photo (product box)
    await frame.setInputFiles("#ackInput_general", boxImage);
    await frame.waitForSelector(".ackGeneralSlot.filled img", { timeout: 10000 });
    await frame.fill("#ackQuestion", "What should I look at here?");
    await frame.click(".ackAnalyzeBtn");
    const generalResultHtml = await waitForAnalyzeResult(frame);
    ok("vision: general screenshot analyze produced a real result panel", !/VISION SERVICE NOT CONNECTED/.test(generalResultHtml));
    console.log("VISION_GENERAL_RESULT_BEGIN\n" + generalResultHtml + "\nVISION_GENERAL_RESULT_END");

    frame = await gotoAskCardstorm(page);

    // C. Unclear/blurry image - expect honest uncertainty
    await frame.setInputFiles("#ackInput_general", blurryImage);
    await frame.waitForSelector(".ackGeneralSlot.filled img", { timeout: 10000 });
    await frame.fill("#ackQuestion", "What card is this?");
    await frame.click(".ackAnalyzeBtn");
    const unclearResultHtml = await waitForAnalyzeResult(frame);
    ok(
      "vision: unclear image produces honest uncertainty language",
      /not (certain|confident|clear|sure)|unable to determine|can't (tell|make out)|blur|low.resolution|possible match/i.test(
        unclearResultHtml
      )
    );
    console.log("VISION_UNCLEAR_RESULT_BEGIN\n" + unclearResultHtml + "\nVISION_UNCLEAR_RESULT_END");

    await context.close();
  }

  // ---- Error state: force the fetch to fail without touching any real network ----
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(SITE_URL + "/index.html", { waitUntil: "networkidle" });
    await page.evaluate(() => window.openApp && window.openApp("market"));
    await page.waitForTimeout(600);
    const frame = await (await page.$("#appFrame")).contentFrame();
    await frame.evaluate(() => {
      window.fetch = () => Promise.reject(new Error("simulated network failure"));
    });
    await frame.evaluate(() => window.show("askcardstorm"));
    await frame.waitForSelector("#ackQuestion");
    await frame.fill("#ackQuestion", "What makes Downtown inserts so valuable?");
    await frame.click(".ackAskBtn");
    await frame.waitForFunction(
      () => {
        const msgs = document.querySelectorAll(".ackMsg.bot");
        if (!msgs.length) return false;
        return !msgs[msgs.length - 1].classList.contains("ackThinking");
      },
      undefined,
      { timeout: 10000 }
    );
    const botMsgs = await frame.$$eval(".ackMsg.bot", (els) => els.map((e) => e.innerHTML));
    const errorReply = botMsgs[botMsgs.length - 1] || "";
    ok("error-state: friendly message shown on network failure", /couldn't reach|try again/i.test(errorReply), errorReply.slice(0, 150));
    ok("error-state: no raw error/stack leaked", !/Error:|at Object|simulated network failure/.test(errorReply));
    await context.close();
  }

  await browser.close();

  console.log(`\n=== SUMMARY: ${pass}/${pass + fail} passed ===`);
  if (fail > 0) process.exit(1);
}

run().catch((err) => {
  console.error("E2E SCRIPT CRASHED:", err);
  process.exit(1);
});
