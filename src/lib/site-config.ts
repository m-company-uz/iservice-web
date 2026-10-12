import 'server-only';
import { cache } from 'react';
import fallback from '@/content/fallback-config.json';
import { fetchSiteConfig, siteConfigSchema } from '@/lib/crm';
import { crmConfigured } from '@/lib/env';
import { log } from '@/lib/log';
import type { SiteConfig } from '@/types/site';

/** Committed snapshot (§4.2): the site never goes down because the CRM is down. */
export const fallbackConfig: SiteConfig = siteConfigSchema.parse(fallback);

/**
 * The single source for every phone, address, hour, category and brand on the site (DEV 3, 5).
 * Live from the CRM with ISR (5 min), else the bundled fallback. Builds never need the CRM.
 */
export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  if (!crmConfigured) return fallbackConfig;
  try {
    return await fetchSiteConfig();
  } catch (err) {
    log('warn', 'site_config_fallback', { reason: err instanceof Error ? err.message : String(err) });
    return fallbackConfig;
  }
});
