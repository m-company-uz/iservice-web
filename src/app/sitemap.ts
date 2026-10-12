import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

const PAGES = ['', '/order'] as const;

/** Every page in both languages, each with its RU/UZ alternates (§11.1). */
export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) =>
    (['ru', 'uz'] as const).map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.8,
      alternates: { languages: { ru: `${SITE_URL}/ru${path}`, uz: `${SITE_URL}/uz${path}` } },
    })),
  );
}
