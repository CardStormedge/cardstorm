// Explicit CORS allow-list. GitHub Pages (the static frontend) and this
// Vercel function live on different origins, so CORS must be handled here.
// Never widen this to "*" - Ask CardStorm accepts free text and images and
// must not become an open proxy other sites can call for free.
const ALLOWED_ORIGINS = new Set([
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
