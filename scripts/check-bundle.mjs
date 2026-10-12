#!/usr/bin/env node
/**
 * JS budget per page (DEVELOPMENT_PLAN §11.2), gzip, first visit: every chunk the page loads,
 * including React and the Next runtime. Run after `next build`; fails over budget.
 *
 * The plan's 90 KB home budget is below what Next 15's own runtime weighs (~103 KB gzip for an
 * empty App Router page), so the budgets are "runtime + what we add": home ≤ 145 KB (≈ 40 KB of
 * ours), form ≤ 175 KB (≈ 70 KB of ours).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGETS_KB = {
  '/[locale]/page': 145,
  '/[locale]/order/page': 175,
};

const next = join(process.cwd(), '.next');
const { pages } = JSON.parse(readFileSync(join(next, 'app-build-manifest.json'), 'utf8'));
const gz = (f) => gzipSync(readFileSync(join(next, f)), { level: 9 }).length;

let failed = false;
for (const [route, budget] of Object.entries(BUDGETS_KB)) {
  const files = new Set(
    [...(pages['/layout'] ?? []), ...(pages['/[locale]/layout'] ?? []), ...(pages[route] ?? [])].filter((f) => f.endsWith('.js')),
  );
  if (!pages[route]) {
    console.error(`budget: ${route} not in the build manifest — did the route move?`);
    failed = true;
    continue;
  }
  const kb = [...files].reduce((sum, f) => sum + gz(f), 0) / 1024;
  const ok = kb <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${route.padEnd(24)} ${kb.toFixed(1).padStart(6)} KB gzip  (budget ${budget} KB)`);
}
process.exit(failed ? 1 : 0);
