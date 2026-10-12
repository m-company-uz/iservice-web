import { defineConfig, devices } from '@playwright/test';

/**
 * Live stack: the website's production build against the real CRM API — no mock CRM.
 * Proves the contract (src/types/site.ts ↔ crm-backend internal/dto/site.go) end to end.
 *
 *   cd ../crm-backend && make seed-demo && make run     # SITE_API_KEY is in its .env
 *   cd ../iservice-web && npm run e2e:live
 *
 * The build runs with the CRM reachable, so pages carry the CRM's real branch ids.
 */
const CRM = process.env.LIVE_CRM_URL ?? 'http://127.0.0.1:8080/api/v1';
const KEY = process.env.SITE_API_KEY ?? 'dev-site-key-change-me-0000000000000000';
const PORT = 3103;

export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './test-results-live',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'ru-RU',
    timezoneId: 'Asia/Tashkent',
  },
  projects: [{ name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      CRM_API_URL: CRM,
      SITE_API_KEY: KEY,
      MIN_FILL_SECONDS: '0',
      RATE_LIMIT_PER_10MIN: '1000',
      RATE_LIMIT_PER_DAY: '1000',
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${PORT}`,
    },
  },
});

export const LIVE_CRM = CRM;
