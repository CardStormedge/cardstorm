// scripts/checklists/fetch-source.js
//
// Real HTTP fetch used by ingest-topps.js / ingest-panini.js. No mocking,
// no simulated response - this makes an actual HTTPS request. When the
// environment's network egress is blocked (as confirmed for topps.com and
// paninisamerica.net/panini.com from this sandbox on 2026-09-15 - see the
// PR description for the exact curl/WebFetch evidence), this throws a
// clearly-labeled NetworkBlockedError instead of returning any placeholder
// content, so callers can never mistake "fetch failed" for "fetch returned
// an empty checklist".

const https = require('https');
const http = require('http');
const { URL } = require('url');

class NetworkBlockedError extends Error {
  constructor(url, cause) {
    super(`Could not reach ${url}: ${cause}`);
    this.name = 'NetworkBlockedError';
    this.url = url;
    this.cause = cause;
  }
}

/**
 * Fetches `url` over HTTPS and resolves with the raw response body text.
 * Rejects with NetworkBlockedError on any transport failure (DNS, TLS,
 * proxy 403, timeout) - it never resolves with fabricated or cached-looking
 * content on failure.
 */
function fetchSource(url, { timeoutMs = 15000, userAgent = 'CardStormChecklistBot/1.0' } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      reject(new NetworkBlockedError(url, `invalid URL: ${e.message}`));
      return;
    }

    // Real sources are always https:// - the http module is only ever
    // selected here for the test suite's local loopback fixture server
    // (scripts/test-checklist-ingestion.js), which has no TLS cert.
    const transport = parsed.protocol === 'http:' ? http : https;
    const req = transport.get(
      parsed,
      { headers: { 'User-Agent': userAgent, Accept: 'text/html' }, timeout: timeoutMs },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new NetworkBlockedError(url, `HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve(body));
      }
    );

    req.on('timeout', () => {
      req.destroy(new NetworkBlockedError(url, `timed out after ${timeoutMs}ms`));
    });
    req.on('error', (err) => {
      reject(new NetworkBlockedError(url, err.message));
    });
  });
}

module.exports = { fetchSource, NetworkBlockedError };
