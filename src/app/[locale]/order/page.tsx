import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LangSwitch } from '@/components/layout/lang-switch';
import { Logo } from '@/components/layout/logo';
import { RequestForm } from '@/features/request/request-form';
import { pageMetadata } from '@/lib/seo';
import { getSiteConfig } from '@/lib/site-config';
import type { Locale } from '@/types/site';

/** `/ru/order`, `/uz/order` — English slug, as the client asked (Q35). */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata(locale, '/order', t('orderTitle'), t('orderDescription'));
}

export default async function OrderPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [config, messages, tc] = await Promise.all([getSiteConfig(), getMessages(), getTranslations('common')]);

  return (
    <div className="min-h-dvh bg-white md:bg-surface">
      {/* Compact black header with "На сайт" (desktop, §7.3); phones get the in-form top bar. */}
      <header className="on-dark hidden bg-night text-white md:block">
        <div className="page-x flex h-[64px] items-center justify-between">
          <Link href="/" aria-label={`i-Service — ${tc('home')}`}>
            <Logo gears={false} priority className="h-7" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[14px] font-medium text-white/75 hover:text-white">
              {tc('toSite')}
            </Link>
            <LangSwitch />
          </div>
        </div>
      </header>
      <main id="main">
        <NextIntlClientProvider
          messages={{ common: messages.common, nav: messages.nav, request: messages.request }}
        >
          <RequestForm config={config} />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
