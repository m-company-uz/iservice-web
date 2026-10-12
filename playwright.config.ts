import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the production build (`npm run build` first) and the mock CRM (§13).
 * Phone 390 px and desktop 1440 px, both locales, Tashkent time.
 */
const CRM_PORT = 8199;
const PORT = 3101;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: './test-results',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'ru-RU',
    timezoneId: 'Asia/Tashkent',
  },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'node mock-crm/server.mjs',
      url: `http://127.0.0.1:${CRM_PORT}/_received`,
      env: { MOCK_CRM_PORT: String(CRM_PORT), SITE_API_KEY: 'e2e-site-key-0000000000000000' },
      reuseExistingServer: false,
    },
    {
      command: `npx next start -p ${PORT}`,
      url: `http://127.0.0.1:${PORT}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        CRM_API_URL: `http://127.0.0.1:${CRM_PORT}/api/v1`,
        SITE_API_KEY: 'e2e-site-key-0000000000000000',
        RATE_LIMIT_PER_10MIN: '1000',
        RATE_LIMIT_PER_DAY: '1000',
        MIN_FILL_SECONDS: '0',
      },
    },
  ],
});

export const MOCK_CRM = `http://127.0.0.1:${CRM_PORT}`;
