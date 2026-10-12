import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { manrope, unbounded } from '@/lib/fonts';
import { SITE_URL } from '@/lib/site-url';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: '#0B0D10',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    applicationName: 'i-Service',
    formatDetection: { telephone: false },
  };
}

/** Only what the shared client islands need (menu, language switch, toast); the form page adds its own. */
const CLIENT_NAMESPACES = ['common', 'nav'] as const;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const home = messages.home as Record<string, unknown>;
  const clientMessages = {
    ...Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]])),
    home: { sent: home.sent },
  };
  const t = await getTranslations('common');

  return (
    <html lang={locale} className={`${unbounded.variable} ${manrope.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only z-50 rounded-control bg-white px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
