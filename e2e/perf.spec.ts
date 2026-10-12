import { expect, test, type Page } from '@playwright/test';

/**
 * Jank test (§11.2): at 4× CPU throttle, record main-thread long tasks while scrolling the home
 * page, opening the menu, typing a phone number and stepping through the form.
 * A task over 100 ms fails; over 50 ms is reported.
 */
test.beforeEach(({}, info) => test.skip(info.project.name !== 'phone', 'measured on the phone layout'));

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
}

async function watchLongTasks(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => w.__long.push(e.duration))).observe({
      type: 'longtask',
      buffered: false,
    });
  });
}

/** Runs an action and returns the long tasks it caused, labelled. */
async function measure(page: Page, label: string, action: () => Promise<unknown>, out: Array<[string, number]>) {
  await resetTasks(page);
  await action();
  await page.waitForTimeout(150);
  for (const d of await tasks(page)) out.push([label, d]);
}

const resetTasks = (page: Page) => page.evaluate(() => ((window as unknown as { __long: number[] }).__long = []));
const tasks = (page: Page) => page.evaluate(() => (window as unknown as { __long: number[] }).__long);

function report(label: string, entries: Array<[string, number]>) {
  const warn = entries.filter(([, d]) => d > 50);
  if (warn.length) console.warn(`${label}: long tasks > 50 ms: ${warn.map(([a, d]) => `${a} ${Math.round(d)}`).join(', ')}`);
  const worst = Math.max(0, ...entries.map(([, d]) => d));
  expect(worst, `${label}: longest task (ms)`).toBeLessThanOrEqual(100);
}

test('@perf scrolling the home page and using the menu stay smooth', async ({ page }) => {
  await watchLongTasks(page);
  await page.goto('/ru', { waitUntil: 'networkidle' });
  await throttle(page);
  await page.waitForTimeout(500);
  const out: Array<[string, number]> = [];
  await measure(page, 'scroll', async () => {
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }, out);
  await measure(page, 'menu-open', () => page.getByRole('button', { name: 'Открыть меню' }).click(), out);
  await measure(page, 'menu-close', () => page.getByRole('button', { name: 'Закрыть меню' }).click(), out);
  report('home', out);
});

test('@perf typing and stepping through the form stay smooth', async ({ page }) => {
  await watchLongTasks(page);
  await page.goto('/ru/order', { waitUntil: 'networkidle' });
  await throttle(page);
  await page.waitForTimeout(500);
  const out: Array<[string, number]> = [];
  await measure(page, 'chip', () => page.getByText('Экран', { exact: true }).click(), out);
  await measure(page, 'typing', () => page.locator('#defect').pressSequentially('Разбит экран', { delay: 30 }), out);
  await measure(page, 'next-1', () => page.getByRole('button', { name: 'Далее' }).click(), out);
  await measure(page, 'phone', async () => {
    await page.locator('#phone').click();
    await page.keyboard.type('901234567', { delay: 40 });
  }, out);
  await measure(page, 'next-2', () => page.getByRole('button', { name: 'Далее' }).click(), out);
  await measure(page, 'date', () => page.locator('#date').selectOption({ index: 1 }), out);
  report('form', out);
});
