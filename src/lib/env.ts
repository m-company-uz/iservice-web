import 'server-only';
import { z } from 'zod';

/**
 * Server-only environment, parsed once. Never import this from a client component — the
 * `server-only` import makes that a build error, so the CRM key cannot reach the bundle.
 */
const schema = z.object({
  CRM_API_URL: z.string().url().optional(),
  SITE_API_KEY: z.string().min(16).optional(),
  RATE_LIMIT_PER_10MIN: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_PER_DAY: z.coerce.number().int().positive().default(20),
  /** Submissions faster than this after opening the form are treated as bots (§9.6). */
  MIN_FILL_SECONDS: z.coerce.number().min(0).default(3),
});

export const env = schema.parse({
  CRM_API_URL: process.env.CRM_API_URL || undefined,
  SITE_API_KEY: process.env.SITE_API_KEY || undefined,
  RATE_LIMIT_PER_10MIN: process.env.RATE_LIMIT_PER_10MIN || undefined,
  RATE_LIMIT_PER_DAY: process.env.RATE_LIMIT_PER_DAY || undefined,
  MIN_FILL_SECONDS: process.env.MIN_FILL_SECONDS || undefined,
});

/** True when the CRM is configured; without it the site runs on the fallback config only. */
export const crmConfigured = Boolean(env.CRM_API_URL && env.SITE_API_KEY);
