import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { Phone } from '@/components/ui/icons';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { firstPhone, formatPhoneDisplay } from '@/lib/hours';
import { getSiteConfig } from '@/lib/site-config';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  const tc = await getTranslations('common');
  const tm = await getTranslations('meta');
  const config = await getSiteConfig();
  const phone = firstPhone(config);
  return (
    <>
      <title>{tm('notFoundTitle')}</title>
      <meta name="robots" content="noindex" />
      <SiteHeader config={config} />
      <main id="main" className="page-x py-20 md:py-28">
        <p className="eyebrow text-brand">404</p>
        <h1 className="mt-3 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[48px]">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-body-soft">{t('text')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={buttonClass('primary', 'lg')}>
            {tc('home')}
          </Link>
          {phone && (
            <a href={`tel:${phone}`} className={buttonClass('outline', 'lg', 'tabular-nums')}>
              <Phone width={18} height={18} />
              {formatPhoneDisplay(phone)}
            </a>
          )}
        </div>
      </main>
      <SiteFooter config={config} />
    </>
  );
}
