import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Branches } from '@/components/home/branches';
import { Hero } from '@/components/home/hero';
import { HoursStrip } from '@/components/home/hours-strip';
import { HowItWorks } from '@/components/home/how-it-works';
import { SentToast } from '@/components/home/sent-toast';
import { Services } from '@/components/home/services';
import { StickyCta } from '@/components/home/sticky-cta';
import { Works } from '@/components/home/works';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { localBusinessJsonLd, pageMetadata } from '@/lib/seo';
import { getSiteConfig } from '@/lib/site-config';
import type { Locale } from '@/types/site';

/** Static + ISR: CRM edits (hours, phones) show up within 5 minutes (§4.2). */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata(locale, '', t('title'), t('description'));
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const config = await getSiteConfig();

  return (
    <>
      <SiteHeader config={config} />
      <main id="main">
        <Hero config={config} />
        <HoursStrip config={config} />
        <Services />
        <Works />
        <HowItWorks />
        <Branches config={config} />
      </main>
      <SiteFooter config={config} />
      <StickyCta />
      <SentToast />
      <script
        type="application/ld+json"
        // JSON-LD is data, not code; the values come from our own config.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(config, locale)).replace(/</g, '\\u003c') }}
      />
    </>
  );
}
