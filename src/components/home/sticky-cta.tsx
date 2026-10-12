'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Phone-only bottom CTA (design §02, frame 2). Shown while neither the hero CTA nor the footer is
 * on screen. IntersectionObserver, not scroll listeners; it moves with transform only (§11.2).
 */
export function StickyCta() {
  const t = useTranslations('common');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = [document.getElementById('hero-cta'), document.getElementById('contacts')].filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;
    const visible = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) visible.set(e.target, e.isIntersecting);
      // Before the first callback for the hero, treat it as visible: no flash on load.
      setShow(targets.every((el) => visible.get(el) === false));
    });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={cn(
        'pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pt-3 transition-transform duration-200 md:hidden',
        show ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
    >
      <Link href="/order" tabIndex={show ? undefined : -1} className={buttonClass('primary', 'lg', 'w-full')}>
        {t('cta')}
      </Link>
    </div>
  );
}
