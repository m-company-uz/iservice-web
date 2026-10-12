'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { routing } from '@/i18n/routing';

/**
 * RU | UZ pill. Keeps the current path, query and #anchor; next-intl writes the NEXT_LOCALE
 * cookie on switch, so the choice is remembered (DEV 4). A plain link without JavaScript.
 */
export function LangSwitch({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common');

  return (
    <div
      role="group"
      aria-label={t('langLabel')}
      className={cn(
        'inline-flex h-9 items-center rounded-full border p-[3px]',
        tone === 'dark' ? 'border-white/15' : 'border-line-strong',
        className,
      )}
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            hrefLang={l}
            lang={l}
            aria-current={active ? 'true' : undefined}
            scroll={false}
            onClick={(e) => {
              if (active) return e.preventDefault();
              const extra = `${window.location.search}${window.location.hash}`;
              if (!extra) return; // the Link handles a bare path itself
              e.preventDefault();
              router.replace(`${pathname}${extra}`, { locale: l, scroll: false });
            }}
            className={cn(
              'flex h-full min-w-[40px] items-center justify-center rounded-full px-2.5 text-[12.5px] font-bold uppercase transition-colors',
              active
                ? tone === 'dark' ? 'bg-white text-ink' : 'bg-ink text-white'
                : tone === 'dark' ? 'text-white/60 hover:text-white' : 'text-muted hover:text-ink',
            )}
          >
            {l}
          </Link>
        );
      })}
    </div>
  );
}
