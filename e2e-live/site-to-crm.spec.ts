import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * The website and the CRM, both real. What the visitor types must arrive in the CRM as the
 * manager will see it, and the CRM's own rules (per-phone cap) must reach the visitor.
 */
const CRM = process.env.LIVE_CRM_URL ?? 'http://127.0.0.1:8080/api/v1';
const KEY = process.env.SITE_API_KEY ?? 'dev-site-key-change-me-0000000000000000';

async function managerToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${CRM}/auth/login`, { data: { phone: '901000002', password: process.env.SEED_PASSWORD ?? 'iservice123' } });
  expect(res.status()).toBe(200);
  return (await res.json()).access_token as string;
}

const freshPhone = () => '93' + String(Date.now()).slice(-7);

test('home shows the CRM’s branches and hours', async ({ page, request }) => {
  const config = await (await request.get(`${CRM}/site/config`, { headers: { 'X-Site-Key': KEY } })).json();
  await page.goto('/ru');
  for (const b of config.branches) {
    await expect(page.locator('#branches')).toContainText(b.name);
    if (b.phone) await expect(page.locator(`a[href="tel:${b.phone}"]`).first()).toBeAttached();
  }
  expect(await (await request.get('/api/health')).json()).toEqual({ status: 'ok', crm: 'ok' });
});

test('branch photos uploaded in the CRM show on the cards', async ({ page, request }) => {
  const config = await (await request.get(`${CRM}/site/config`, { headers: { 'X-Site-Key': KEY } })).json();
  // seed-photo.mjs saw to it that at least one branch has one.
  expect(config.branches.some((b: { photo_file: string | null }) => b.photo_file)).toBe(true);
  await page.goto('/ru');
  for (const b of config.branches as { name: string; photo_file: string | null }[]) {
    const img = page.locator('#branches li', { hasText: b.name }).locator('img');
    if (!b.photo_file) {
      await expect(img).toHaveCount(0);
      continue;
    }
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('src', new RegExp(encodeURIComponent(`/api/branch-photos/${b.photo_file}`)));
    // Loaded through next/image → /api/branch-photos → the CRM, not just referenced.
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  }
});

test('a request typed on the site arrives in the CRM, every field where the manager reads it', async ({ page, request }) => {
  const name = `Live ${Date.now() % 1_000_000}`;
  const phone = freshPhone();

  await page.goto('/ru/order');
  await page.getByText('Экран', { exact: true }).click();
  await page.locator('#device_brand').selectOption('apple');
  await page.locator('#device_model').fill('iPhone 13 Pro');
  await page.locator('#defect').fill('Разбит экран, тач работает');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.locator('#client_name').fill(name);
  await page.locator('#phone').fill(phone);
  await page.getByText('Telegram', { exact: true }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByText('Aviasozlar 2-65', { exact: true }).click();
  await page.locator('#date').selectOption({ index: 1 });
  await page.locator('input[name="time"]:not([disabled])').first().check({ force: true });
  await page.locator('#comment').fill('Позвонить после 18:00');
  await page.getByText('Согласен на обработку').click();
  await page.getByRole('button', { name: 'Отправить заявку' }).click();

  const toast = page.getByRole('status');
  await expect(toast).toContainText('Заявка отправлена');
  const number = Number((await toast.innerText()).match(/№(\d+)/)?.[1]);
  expect(number).toBeGreaterThanOrEqual(1000);

  const token = await managerToken(request);
  const list = await (await request.get(`${CRM}/inquiries?q=${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  expect(list.total).toBe(1);
  const got = list.data[0];
  expect(got).toMatchObject({
    request_number: number,
    source: 'website',
    status: 'new',
    name,
    phone: `+998${phone}`,
    channel: 'telegram',
    locale: 'ru',
    category: 'screen',
    category_label: { ru: 'Экран', uz: 'Ekran' },
    brand_label: 'Apple',
    device_type: 'phone',
    comment: 'Позвонить после 18:00',
    branch_name: 'Aviasozlar 2-65',
    device_info: { device: 'Apple iPhone 13 Pro', defect: 'Разбит экран, тач работает' },
  });
  // The slot the client picked, at Tashkent time.
  const preferred = new Date(got.preferred_at);
  expect(['10:00', '12:00', '15:00', '18:00']).toContain(
    preferred.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }),
  );
  expect(got.waiting).not.toBeNull();
});

test('the CRM’s per-phone cap reaches the visitor as “too many requests”, with the phone to call', async ({ page, request }) => {
  const phone = freshPhone();
  // Three open requests already, posted the way the site's server posts them.
  for (const category of ['battery', 'no_power', 'water_damage']) {
    const res = await request.post(`${CRM}/site/requests`, {
      headers: { 'X-Site-Key': KEY },
      data: {
        idempotency_key: crypto.randomUUID(), locale: 'ru', client_name: 'Cap', phone: `+998${phone}`,
        channel: 'call', device_type: 'phone', device_brand: null, device_model: null, category,
        defect: null, branch_id: null, preferred_at: null, comment: null, consent: true, meta: {},
      },
    });
    expect(res.status()).toBe(201);
  }

  await page.goto('/ru/order');
  await page.getByText('Экран', { exact: true }).click();
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.locator('#phone').fill(phone);
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.getByText('Согласен на обработку').click();
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'Слишком много заявок' });
  await expect(alert).toBeVisible();
  await expect(alert.locator('a[href^="tel:+998"]')).toBeVisible();
});
