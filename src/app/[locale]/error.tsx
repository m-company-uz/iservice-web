'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import fallback from '@/content/fallback-config.json';
import { formatPhoneDisplay } from '@/lib/hours';

/**
 * Last-resort error page. Can't load config from the server here, so the phone comes from the
 * bundled fallback (the same snapshot the site uses when the CRM is down).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  const tc = useTranslations('common');
  const phone = fallback.branches.find((b) => b.phone)?.phone;

  useEffect(() => {
    console.error(JSON.stringify({ level: 'error', event: 'page_error', digest: error.digest }));
  }, [error]);

  return (
    <main id="main" className="page-x py-20 md:py-28">
      <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[44px]">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-body-soft">{t('text')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClass('primary', 'lg')}>
          {t('retry')}
        </button>
        <Link href="/" className={buttonClass('outline', 'lg')}>
          {tc('home')}
        </Link>
        {phone && (
          <a href={`tel:${phone}`} className={buttonClass('outline', 'lg', 'tabular-nums')}>
            {formatPhoneDisplay(phone)}
          </a>
        )}
      </div>
    </main>
  );
}
