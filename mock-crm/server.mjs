#!/usr/bin/env node
/**
 * A tiny stand-in for the CRM's `/api/v1/site/*` group (DEVELOPMENT_PLAN §10), for offline
 * development and the mocked Playwright suite. `npm run e2e:live` uses the real CRM instead.
 *
 *   GET  /api/v1/site/config     → src/content/fallback-config.json
 *   POST /api/v1/site/requests   → 201 { id, request_number, status }, 200 on idempotent replay
 *   GET  /_received              → every accepted payload (for tests)
 *   POST /_reset                 → forget everything
 *
 * Scenario phones (last four digits): …0422 → 422 on phone, …0429 → 429, …0500 → 500,
 * …0408 → slow (3 s) then 201.
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'src/content/fallback-config.json'), 'utf8'));
const KEY = process.env.SITE_API_KEY || 'dev-site-key-change-me-0000000000000000';
const PORT = Number(process.env.MOCK_CRM_PORT || 8099);

let received = [];
let byKey = new Map();
let next = 1000;

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const fail = (res, status, code, message, fields) =>
  send(res, status, { error: { code, message, ...(fields ? { fields } : {}) } });

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
  });

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (url.pathname === '/_received') return send(res, 200, received);
  if (url.pathname === '/_reset' && req.method === 'POST') {
    received = [];
    byKey = new Map();
    return send(res, 200, { ok: true });
  }

  if (url.pathname.startsWith('/api/v1/site/') && req.headers['x-site-key'] !== KEY) {
    return fail(res, 401, 'unauthorized', 'bad site key');
  }

  if (url.pathname === '/api/v1/site/config' && req.method === 'GET') return send(res, 200, config);

  if (url.pathname === '/api/v1/site/requests' && req.method === 'POST') {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return fail(res, 400, 'bad_request', 'malformed json');
    }
    const tail = String(body.phone ?? '').slice(-4);
    if (tail === '0422') return fail(res, 422, 'validation_failed', 'invalid', { phone: 'invalid' });
    if (tail === '0429') return fail(res, 429, 'rate_limited', 'too many');
    if (tail === '0500') return fail(res, 500, 'internal', 'boom');
    if (tail === '0408') await new Promise((r) => setTimeout(r, 3000));

    const existing = byKey.get(body.idempotency_key);
    if (existing) return send(res, 200, existing);
    const created = { id: randomUUID(), request_number: next++, status: 'new' };
    byKey.set(body.idempotency_key, created);
    received.push({ ...body, _created: created });
    return send(res, 201, created);
  }

  fail(res, 404, 'not_found', 'not found');
}).listen(PORT, () => console.log(`mock CRM on http://localhost:${PORT}/api/v1`));
