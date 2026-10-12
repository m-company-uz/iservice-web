import { expect, test } from '@playwright/test';
import { MOCK_CRM } from './helpers';

/** The public edge (§4.3, §9.6). Project-independent, so it runs once. */
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'API checks run once'));

const valid = (over: Record<string, unknown> = {}) => ({
  idempotency_key: crypto.randomUUID(),
  locale: 'ru',
  client_name: 'API test',
  phone: '+998901234567',
  channel: 'call',
  device_type: 'phone',
  device_brand: null,
  device_model: null,
  category: 'screen',
  defect: null,
  branch_id: null,
  preferred_at: null,
  comment: null,
  consent: true,
  started_at: Date.now() - 60_000,
  referrer: null,
  utm: { source: null, medium: null, campaign: null },
  ...over,
});

test('a valid request is forwarded, and a replay is idempotent', async ({ request }) => {
  const body = valid({ client_name: `API ${Math.random()}` });
  const first = await request.post('/api/requests', { data: body });
  expect(first.status()).toBe(201);
  const { request_number } = await first.json();
  expect(typeof request_number).toBe('number');
  const again = await request.post('/api/requests', { data: body });
  expect(again.status()).toBe(200);
  expect((await again.json()).request_number).toBe(request_number);
});

test('honeypot: looks like success, never reaches the CRM', async ({ request }) => {
  const name = `bot ${Math.random()}`;
  const res = await request.post('/api/requests', { data: valid({ client_name: name, website: 'http://spam' }) });
  expect(res.status()).toBe(201);
  expect(await res.json()).toEqual({ request_number: null });
  const received = (await (await request.get(`${MOCK_CRM}/_received`)).json()) as Array<{ client_name: string }>;
  expect(received.some((r) => r.client_name === name)).toBe(false);
});

test('validation: standard error shape, codes checked against the catalog', async ({ request }) => {
  let res = await request.post('/api/requests', { data: valid({ category: 'teleport' }) });
  expect(res.status()).toBe(422);
  expect(await res.json()).toMatchObject({ error: { code: 'validation_failed', fields: { category: 'invalid' } } });

  // Laptop problems are not offered for phones.
  res = await request.post('/api/requests', { data: valid({ category: 'cleaning' }) });
  expect(res.status()).toBe(422);

  res = await request.post('/api/requests', { data: valid({ phone: '901234567' }) });
  expect((await res.json()).error.fields).toEqual({ phone: 'phone_invalid' });

  res = await request.post('/api/requests', { data: valid({ preferred_at: '2020-01-01T10:00:00+05:00' }) });
  expect((await res.json()).error.fields).toEqual({ preferred_at: 'invalid' });
});

test('wrong content type and oversized bodies are refused', async ({ request }) => {
  expect((await request.post('/api/requests', { headers: { 'content-type': 'text/plain' }, data: 'hi' })).status()).toBe(415);
  const big = valid({ comment: 'x'.repeat(20_000) });
  expect((await request.post('/api/requests', { data: big })).status()).toBe(413);
});

test('CRM errors are mapped, never passed through', async ({ request }) => {
  const res = await request.post('/api/requests', { data: valid({ phone: '+998901230500' }) });
  expect(res.status()).toBe(502);
  expect(await res.json()).toEqual({ error: { code: 'unavailable', message: 'CRM unavailable' } });
});

test('health reports the CRM separately and is always 200', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok', crm: 'ok' });
});
