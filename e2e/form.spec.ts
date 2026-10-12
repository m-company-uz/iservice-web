import { expect, test } from '@playwright/test';
import {
  collectErrors,
  expectAxeClean,
  expectNoOverflow,
  fillContacts,
  fillDevice,
  fillTime,
  next,
  receivedBy,
  uniqueName,
} from './helpers';

const heading = (name: string) => ({ level: 2 as const, name });

test('happy path: the request reaches the CRM with the right payload, and the toast shows its number', async ({ page }) => {
  const errors = collectErrors(page);
  const name = uniqueName();
  await page.goto('/ru/order?utm_source=instagram&utm_medium=bio');

  await expect(page.getByRole('heading', heading('Что случилось с устройством?'))).toBeVisible();
  await expectNoOverflow(page);
  await expectAxeClean(page);
  await fillDevice(page);
  await next(page);

  await expect(page.getByRole('heading', heading('Как с вами связаться?'))).toBeFocused();
  await expect(page).toHaveURL(/step=2/);
  await fillContacts(page, name);
  await page.getByText('Telegram', { exact: true }).click();
  await expectAxeClean(page);
  await next(page);

  await expect(page.getByRole('heading', heading('Филиал и удобное время'))).toBeVisible();
  // The running summary shows what was entered.
  await expect(page.getByText('Apple iPhone 13 Pro').locator('visible=true')).toBeVisible();
  await fillTime(page);
  await expectAxeClean(page);
  await page.getByRole('button', { name: 'Отправить заявку' }).click();

  const toast = page.getByRole('status');
  await expect(toast).toContainText('Заявка отправлена');
  await expect(toast).toContainText(/Заявка №\d+\./);
  await expect(page).toHaveURL(/\/ru$/);

  const [sent] = await receivedBy(page, name);
  expect(sent).toMatchObject({
    locale: 'ru',
    phone: '+998901234567',
    channel: 'telegram',
    device_type: 'phone',
    device_brand: 'apple',
    device_model: 'iPhone 13 Pro',
    category: 'screen',
    defect: 'Разбит экран, тач работает',
    branch_id: '6a1f0c52-3b8e-4f0e-9c1d-2f7a5b9e0a01',
    consent: true,
    comment: null,
    meta: { utm: { source: 'instagram', medium: 'bio', campaign: null } },
  });
  expect(sent!.preferred_at).toMatch(/^\d{4}-\d{2}-\d{2}T(10|12|15|18):00:00\+05:00$/);
  expect(sent!.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
  // The draft is gone after success: a fresh form is empty.
  await page.goto('/ru/order');
  await expect(page.locator('#defect')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('an empty step shows the banner and the field error, which clear once fixed', async ({ page }) => {
  await page.goto('/ru/order');
  await next(page);
  await expect(page.getByRole('button', { name: /Проверьте 1 поле/ })).toBeVisible();
  await expect(page.getByText('Выберите неисправность или опишите её')).toBeVisible();
  await expect(page).not.toHaveURL(/step=2/);
  await page.locator('#defect').fill('Не заряжается');
  await expect(page.getByText('Выберите неисправность или опишите её')).toBeHidden();
  await next(page);
  await expect(page).toHaveURL(/step=2/);
});

test('phone: errors on blur, pasted numbers normalise', async ({ page }) => {
  await page.goto('/ru/order');
  await page.locator('#defect').fill('x');
  await next(page);
  const phone = page.locator('#phone');
  await phone.fill('90 12');
  await page.locator('#client_name').click();
  await expect(page.getByText('Введите номер в формате +998 XX XXX-XX-XX')).toBeVisible();
  await phone.fill('998901234567');
  await expect(phone).toHaveValue('+998 90 123-45-67');
  await expect(page.getByText('Введите номер в формате +998 XX XXX-XX-XX')).toBeHidden();
  await phone.fill('0 90 123 45 67');
  await expect(phone).toHaveValue('+998 90 123-45-67');
});

test('browser Back moves between steps and keeps what was typed', async ({ page }) => {
  await page.goto('/ru/order');
  await fillDevice(page);
  await next(page);
  await fillContacts(page, 'Aziz');
  await next(page);
  await expect(page).toHaveURL(/step=3/);
  await page.goBack();
  await expect(page.getByRole('heading', heading('Как с вами связаться?'))).toBeVisible();
  await expect(page.locator('#phone')).toHaveValue('+998 90 123-45-67');
  await page.goBack();
  await expect(page.getByRole('heading', heading('Что случилось с устройством?'))).toBeVisible();
  await expect(page.locator('#device_model')).toHaveValue('iPhone 13 Pro');
  await page.goForward();
  await expect(page.getByRole('heading', heading('Как с вами связаться?'))).toBeVisible();
});

test('a reload keeps the draft and the step', async ({ page }) => {
  await page.goto('/ru/order');
  await fillDevice(page);
  await next(page);
  await fillContacts(page, 'Aziz');
  await page.waitForTimeout(800); // draft save is debounced
  await page.reload();
  await expect(page.getByRole('heading', heading('Как с вами связаться?'))).toBeVisible();
  await expect(page.locator('#client_name')).toHaveValue('Aziz');
  await expect(page.locator('#phone')).toHaveValue('+998 90 123-45-67');
});

test('a deep link to step 3 with an empty form starts at step 1', async ({ page }) => {
  await page.goto('/ru/order?step=3');
  await expect(page.getByRole('heading', heading('Что случилось с устройством?'))).toBeVisible();
  await expect(page).not.toHaveURL(/step=/);
});

test('a server error keeps the data and offers a retry and a call', async ({ page }) => {
  const name = uniqueName();
  await page.goto('/ru/order');
  await fillDevice(page);
  await next(page);
  await fillContacts(page, name, '901230500'); // mock CRM answers 500
  await next(page);
  await fillTime(page);
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  // Next's route announcer is also role=alert, so filter by text.
  const alert = page.getByRole('alert').filter({ hasText: 'Не удалось отправить заявку' });
  await expect(alert).toBeVisible();
  await expect(alert.locator('a[href="tel:+998983114646"]')).toBeVisible();
  await expect(page.locator('#comment')).toBeEditable();

  // Fix the number on step 2 and retry: everything else is still there.
  await page.getByRole('button', { name: 'Назад' }).click();
  await page.locator('#phone').fill('901234568');
  await next(page);
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.getByRole('status')).toContainText('Заявка отправлена');
  expect(await receivedBy(page, name)).toHaveLength(1);
});

test('rate limited: says so and offers the phone', async ({ page }) => {
  await page.goto('/ru/order');
  await fillDevice(page);
  await next(page);
  await fillContacts(page, uniqueName(), '901230429');
  await next(page);
  await fillTime(page);
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'Слишком много заявок' });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Повторить' })).toHaveCount(0);
});

test('a CRM validation error jumps back to the step that owns the field', async ({ page }) => {
  await page.goto('/ru/order');
  await fillDevice(page);
  await next(page);
  await fillContacts(page, uniqueName(), '901230422');
  await next(page);
  await fillTime(page);
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.getByRole('heading', heading('Как с вами связаться?'))).toBeVisible();
  await expect(page.getByText('Проверьте это поле')).toBeVisible();
});

test('laptops: no brand list, laptop problems offered', async ({ page }) => {
  await page.goto('/ru/order');
  await page.getByText('Ноутбук', { exact: true }).click();
  await expect(page.locator('#device_brand')).toHaveCount(0);
  await expect(page.getByText('Чистка и профилактика', { exact: true })).toBeVisible();
  await expect(page.getByText('Порт зарядки', { exact: true })).toHaveCount(0);
  await expect(page.locator('#device_model')).toHaveAttribute('placeholder', 'ASUS VivoBook 15');
});

test('uz: the form speaks Uzbek and has no WhatsApp', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/uz/order');
  await page.getByRole('button', { name: 'Keyingi' }).click();
  await expect(page.getByText('Nosozlikni tanlang yoki tavsiflang')).toBeVisible();
  await expect(page.getByRole('button', { name: /1 ta maydonni tekshiring/ })).toBeVisible();
  await page.locator('#defect').fill('Yoqilmaydi');
  await page.getByRole('button', { name: 'Keyingi' }).click();
  await expect(page.getByText('Qoʻngʻiroq', { exact: true })).toBeVisible();
  await expect(page.getByText('WhatsApp')).toHaveCount(0);
  await expectAxeClean(page);
  expect(errors).toEqual([]);
});

test('past slots are disabled for today', async ({ page }) => {
  // 16:30 on a Monday in Tashkent: only 18:00 is still more than an hour away.
  await page.clock.setFixedTime(new Date('2026-10-12T16:30:00+05:00'));
  await page.goto('/ru/order');
  await page.locator('#defect').fill('x');
  await next(page);
  await page.locator('#phone').fill('901234567');
  await next(page);
  await page.getByText('Aviasozlar 2-65', { exact: true }).click();
  await page.locator('#date').selectOption('2026-10-12');
  const slot = (s: string) => page.locator(`input[name="time"][value="${s}"]`);
  await expect(slot('15:00')).toBeDisabled();
  await expect(slot('18:00')).toBeEnabled();
  await expect(page.locator('#date option')).toHaveCount(15); // placeholder + 14 working days
  await expect(page.locator('#date option', { hasText: 'Вс,' })).toHaveCount(0);
});

test('desktop: switching language mid-form keeps the draft', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the switch sits in the desktop header');
  await page.goto('/ru/order');
  await page.locator('#defect').fill('Не включается');
  await page.waitForTimeout(800);
  await page.locator('header').getByRole('link', { name: 'uz' }).click();
  await expect(page).toHaveURL(/\/uz\/order$/);
  await expect(page.locator('#defect')).toHaveValue('Не включается');
});
