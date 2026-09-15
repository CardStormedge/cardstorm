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

/**
 * Same real-fetch contract as fetchSource(), but resolves with
 * { statusCode, headers, body } instead of just the body text. Used by
 * diagnostic/discovery tooling (e.g. the live Topps ingestion test) that
 * needs the real Content-Type/Content-Disposition headers to tell an HTML
 * page apart from a served CSV/XLSX/PDF download - fetchSource() itself is
 * left untouched so every existing caller/test keeps its exact contract.
 */
function fetchSourceMeta(url, { timeoutMs = 15000, userAgent = 'CardStormChecklistBot/1.0', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      reject(new NetworkBlockedError(url, `invalid URL: ${e.message}`));
      return;
    }

    const transport = parsed.protocol === 'http:' ? http : https;
    const req = transport.get(
      parsed,
      { headers: { 'User-Agent': userAgent, Accept: '*/*', ...headers }, timeout: timeoutMs },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || null,
            headers: res.headers || {},
            body: Buffer.concat(chunks),
          });
        });
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

module.exports = { fetchSource, fetchSourceMeta, NetworkBlockedError };
