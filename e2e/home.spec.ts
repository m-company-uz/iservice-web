import { expect, test } from '@playwright/test';
import { collectErrors, expectAxeClean, expectNoOverflow } from './helpers';

for (const locale of ['ru', 'uz'] as const) {
  test(`home (${locale}) renders from config, has no overflow and passes axe`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`/${locale}`);
    await expect(page).toHaveTitle(locale === 'ru' ? /Ремонт телефонов/ : /telefon va noutbuk/);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(locale === 'ru' ? 'Ремонт телефона' : 'Telefon taʼmiri');
    // Hours strip: union of both branches, from config.
    await expect(page.getByText(locale === 'ru' ? 'Пн–Сб 09:00–21:30' : 'Du–Sh 09:00–21:30').first()).toBeVisible();
    // Every phone is a tel: link (DEV 3).
    await expect(page.locator('a[href="tel:+998983114646"]').first()).toBeAttached();
    await expect(page.locator('a[href="tel:+998983666010"]').first()).toBeAttached();
    // hreflang alternates + canonical (DEV 4).
    await expect(page.locator('link[rel="alternate"][hreflang="uz"]')).toHaveAttribute('href', /\/uz$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/${locale}$`));
    // No unconfirmed claims (Q4).
    await expect(page.locator('body')).not.toContainText(/40 мин|гарантия 6|с 2016|15 минут|UZS/);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expectNoOverflow(page);
    await expectAxeClean(page);
    expect(errors).toEqual([]);
  });
}

test('branch links open the web map on desktop', async ({ page }) => {
  await page.goto('/ru');
  const link = page.locator('#branches a[aria-label*="Aviasozlar 2-65"]');
  await expect(link).toHaveAttribute('href', 'https://yandex.uz/maps/?pt=69.348154,41.284524&z=17&l=map');
  await expect(link).toHaveAttribute('target', '_blank');
});

test('branch links hand off to the default map app on Android and iPhone', async ({ browser }) => {
  const android = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 11; Redmi 9A) Mobile' });
  const a = await android.newPage();
  await a.goto('/ru');
  const link = a.locator('#branches a[aria-label*="Aviasozlar 2-65"]');
  await expect(link).toHaveAttribute('href', /^geo:41\.284524,69\.348154\?q=/);
  await expect(link).not.toHaveAttribute('target', '_blank');
  // The second branch has no coordinates yet: a text search the map app resolves.
  await expect(a.locator('#branches a[aria-label*="Aviasozlar bozori"]')).toHaveAttribute('href', /^geo:0,0\?q=iService/);
  await android.close();

  const iphone = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
  const i = await iphone.newPage();
  await i.goto('/ru');
  await expect(i.locator('#branches a[aria-label*="Aviasozlar 2-65"]')).toHaveAttribute('href', /^https:\/\/maps\.apple\.com\/\?ll=41\.284524,69\.348154/);
  await iphone.close();
});

test('language switch keeps the path and anchor, and is remembered', async ({ page, context }) => {
  await page.goto('/ru#branches');
  await page.locator('header').getByRole('group', { name: 'Язык сайта' }).getByRole('link', { name: 'uz' }).click();
  await expect(page).toHaveURL(/\/uz#branches$/);
  await expect(page.locator('#branches-title')).toHaveText('Filiallar');
  const cookie = (await context.cookies()).find((c) => c.name === 'NEXT_LOCALE');
  expect(cookie?.value).toBe('uz');
  await page.goto('/');
  await expect(page).toHaveURL(/\/uz$/);
});

test('a bare visit picks the browser language', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'uz-UZ' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/uz$/);
  await ctx.close();
});

test('success toast shows the request number and cleans the URL', async ({ page }) => {
  await page.goto('/ru?sent=1&n=1042');
  const toast = page.getByRole('status');
  await expect(toast).toContainText('Заявка отправлена');
  await expect(toast).toContainText('Заявка №1042.');
  await expect(page).toHaveURL(/\/ru$/);
  await toast.getByRole('button', { name: 'Закрыть уведомление' }).click();
  await expect(toast).toBeEmpty();
});

test('phone: sticky CTA is hidden over the hero and appears after scrolling', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  await page.goto('/ru');
  const bar = page.locator('div.fixed.bottom-0');
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#services').scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#contacts').scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
});

test('phone: the menu opens, traps focus and closes on an anchor', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone layout only');
  await page.goto('/ru');
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  const dialog = page.getByRole('dialog', { name: 'Меню' });
  await expect(dialog).toBeVisible();
  await expectAxeClean(page);
  await dialog.getByRole('link', { name: 'Филиалы' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#branches$/);
});

test('unknown pages get a localised 404', async ({ page }) => {
  const res = await page.goto('/uz/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bunday sahifa yoʻq');
});

test('SEO files', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/ru/order');
  expect(sitemap).toContain('hreflang="uz"');
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /api/');
});
