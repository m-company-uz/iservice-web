import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-url';
import type { Locale, SiteConfig } from '@/types/site';

/** Per-page metadata with self-canonical and hreflang alternates (DEV 4, §11.1). */
export function pageMetadata(locale: Locale, path: '' | `/${string}`, title: string, description: string): Metadata {
  const url = (l: Locale) => `${SITE_URL}/${l}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: url(locale),
      languages: { ru: url('ru'), uz: url('uz'), 'x-default': url('ru') },
    },
    openGraph: {
      type: 'website',
      siteName: 'i-Service',
      title,
      description,
      url: url(locale),
      locale: locale === 'ru' ? 'ru_RU' : 'uz_UZ',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** One LocalBusiness entry per branch (§11.1). Rendered as JSON-LD on the home page. */
export function localBusinessJsonLd(config: SiteConfig, locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@graph': config.branches.map((b) => ({
      '@type': 'MobilePhoneStore',
      '@id': `${SITE_URL}/#branch-${b.id}`,
      name: `i-Service — ${b.name}`,
      url: `${SITE_URL}/${locale}`,
      ...(b.phone ? { telephone: b.phone } : {}),
      image: `${SITE_URL}/opengraph-image.jpg`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: locale === 'ru' ? b.address_ru : b.address_uz,
        addressLocality: locale === 'ru' ? 'Ташкент' : 'Toshkent',
        addressCountry: 'UZ',
      },
      ...(b.latitude !== null && b.longitude !== null
        ? { geo: { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } }
        : {}),
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: b.work_days.map((d) => DAY_NAMES[d - 1]),
          opens: b.opens_at,
          closes: b.closes_at,
        },
      ],
      sameAs: [`https://t.me/${config.contacts.telegram}`],
    })),
  };
}
