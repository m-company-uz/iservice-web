import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

/**
 * `/ru/…` and `/uz/…` (DEV note 4). Default Russian (Q13). Unlike the CRM, detection is on:
 * a public visitor's browser language is a good first guess. The choice is remembered for a
 * year in `NEXT_LOCALE` — strictly functional, the site's only cookie (§11.4).
 */
export const routing = defineRouting({
  locales: ['ru', 'uz'],
  defaultLocale: 'ru',
  localePrefix: 'always',
  localeDetection: true,
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
  // Page metadata emits the hreflang set with the canonical domain; the middleware's own Link
  // header would use the request host and contradict it.
  alternateLinks: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
