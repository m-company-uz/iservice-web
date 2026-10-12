/** Public base URL for canonical/hreflang/sitemap. Safe on both server and client. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');
