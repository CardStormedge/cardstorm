// Explicit CORS allow-list. GitHub Pages (the static frontend) and this
// Vercel function live on different origins, so CORS must be handled here.
// Never widen this to "*" - Ask CardStorm accepts free text and images and
// must not become an open proxy other sites can call for free.
//
// DOMAIN AUDIT (see PR discussion): the repo's CNAME file only ever
// configures ONE custom domain for GitHub Pages - it currently contains
// "cardstormguide.com". The user reports actually viewing/using the live
// site at "https://stormguide.com" via direct iPhone screenshots. This
// sandbox's network egress proxy blocks both stormguide.com and
// cardstormguide.com (WebFetch/curl both return EGRESS_BLOCKED), so I could
// NOT independently confirm via an HTTP request which domain redirects to
// which, whether a www. variant is in play, or which origin the browser
// retains after navigation - I'm reporting that limitation honestly rather
// than guessing. Nothing in the repo (workflows, meta tags, other config)
// mentions "stormguide.com" without "card" in it - the CNAME mechanism
// GitHub Pages uses only supports a single domain, so if both domains are
// genuinely live, the second one is most likely handled by a
// registrar/DNS-level redirect that lives outside this repo and thus
// outside what a code audit here can see.
//
// Given real user-observed evidence for stormguide.com and the repo's own
// CNAME for cardstormguide.com, both (plus their www. variants) are allowed
// below so neither a real user nor a real redirect target is ever
// CORS-blocked. Please confirm which domain(s) are actually live/canonical
// (e.g. by checking your DNS/registrar or Pages custom-domain settings) -
// if one of these is NOT actually part of this deployment, tell me and
// I'll remove it immediately rather than leave an unnecessary origin
// allowed.
const ALLOWED_ORIGINS = new Set([
  "https://stormguide.com",
  "https://www.stormguide.com",
  "https://cardstormguide.com",
  "https://www.cardstormguide.com",
]);

// Vercel preview deployments (e.g. cardstorm-git-branch-team.vercel.app) and
// localhost are allowed only in non-production so PR previews and local dev
// can exercise the endpoint without opening it up in production.
function isAllowedDevOrigin(origin) {
  if (!origin) return false;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed =
    (origin && ALLOWED_ORIGINS.has(origin)) ||
    (process.env.VERCEL_ENV !== "production" && isAllowedDevOrigin(origin));

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  return allowed;
}

module.exports = { applyCors, ALLOWED_ORIGINS };
