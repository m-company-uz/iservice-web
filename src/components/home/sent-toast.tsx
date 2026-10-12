'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Close } from '@/components/ui/icons';

/**
 * "Заявка отправлена" after a successful submit (§7.2). The form redirects to `?sent=1&n=1042`;
 * this reads it once, then cleans the URL. Read from `location`, not useSearchParams, so the
 * home page stays fully static. Never promises "15 минут" (Q4).
 */
export function SentToast() {
  const t = useTranslations('home.sent');
  const [number, setNumber] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('sent') !== '1') return;
    const n = url.searchParams.get('n');
    setNumber(n && /^\d+$/.test(n) ? n : null);
    url.searchParams.delete('sent');
    url.searchParams.delete('n');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    const timer = window.setTimeout(() => setNumber(undefined), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4 md:top-6">
      {number !== undefined && (
        <div className="pointer-events-auto flex w-full max-w-[440px] animate-toast-in items-start gap-3 rounded-card bg-white p-4 shadow-toast">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
            <Check width={18} height={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{t('title')}</p>
            <p className="mt-0.5 text-[13.5px] text-body-soft">
              {number && <span className="font-semibold text-ink">{t('number', { number })} </span>}
              {t('sub')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNumber(undefined)}
            aria-label={t('close')}
            className="-m-1 flex size-8 items-center justify-center rounded-control text-muted hover:text-ink"
          >
            <Close width={18} height={18} />
          </button>
        </div>
      )}
    </div>
  );
}
