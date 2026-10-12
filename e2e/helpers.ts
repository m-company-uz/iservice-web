import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const MOCK_CRM = 'http://127.0.0.1:8199';

/** No horizontal scroll at any width (§6). */
export async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}

/** WCAG 2.1 AA via axe (§11.3). */
export async function expectAxeClean(page: Page) {
  // axe ships its own playwright-core typings, a version apart from ours; the runtime object is the same.
  const options = { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
  const { violations } = await new AxeBuilder(options).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/** Fails on any console error or uncaught exception (e.g. a missing translation). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
}

export interface Received {
  client_name: string | null;
  [k: string]: unknown;
}

export async function receivedBy(page: Page, name: string): Promise<Received[]> {
  const res = await page.request.get(`${MOCK_CRM}/_received`);
  return ((await res.json()) as Received[]).filter((r) => r.client_name === name);
}

export const uniqueName = () => `E2E ${Math.random().toString(36).slice(2, 8)}`;

// ── Form steps (RU) ─────────────────────────────────────────────────────────

export async function next(page: Page) {
  await page.getByRole('button', { name: 'Далее' }).click();
}

export async function fillDevice(page: Page) {
  await page.getByText('Экран', { exact: true }).click();
  await page.locator('#device_brand').selectOption('apple');
  await page.locator('#device_model').fill('iPhone 13 Pro');
  await page.locator('#defect').fill('Разбит экран, тач работает');
}

export async function fillContacts(page: Page, name: string, phone = '901234567') {
  await page.locator('#client_name').fill(name);
  await page.locator('#phone').fill(phone);
}

export async function fillTime(page: Page) {
  await page.getByText('Aviasozlar 2-65', { exact: true }).click();
  await page.locator('#date').selectOption({ index: 1 });
  await page.locator('fieldset').filter({ hasText: 'Время' }).locator('input[type=radio]:not([disabled])').first().check({ force: true });
  await page.getByText('Согласен на обработку').click();
}
