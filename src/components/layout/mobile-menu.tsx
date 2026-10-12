'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { Close, Menu, Phone, Telegram } from '@/components/ui/icons';
import { LangSwitch } from './lang-switch';
import { Logo } from './logo';

export interface MenuLink {
  href: string;
  label: string;
}

/**
 * Phone menu (not drawn in the design; built in its visual language, §2.1): a full-height dark
 * sheet with the anchors, language, CTA, call and Telegram. Radix gives focus trap and Esc.
 */
export function MobileMenu({ links, phone, phoneLabel, telegram }: {
  links: MenuLink[];
  phone: string | null;
  phoneLabel: string | null;
  telegram: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={t('openMenu')}
        className="ml-2 flex size-10 items-center justify-center rounded-control border border-white/20 text-white lg:hidden"
      >
        <Menu />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          // An anchor tap closes the sheet; don't yank focus back to the trigger mid-scroll.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="on-dark fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night text-white data-[state=open]:animate-sheet-in"
        >
          <Dialog.Title className="sr-only">{t('menu')}</Dialog.Title>
          <div className="page-x flex h-16 shrink-0 items-center">
            <Logo className="h-8" />
            <Dialog.Close
              aria-label={t('closeMenu')}
              className="ml-auto flex size-10 items-center justify-center rounded-control border border-white/20"
            >
              <Close />
            </Dialog.Close>
          </div>
          <nav aria-label={t('label')} className="page-x mt-4">
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-4 font-display text-[22px] font-bold tracking-tight"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="page-x mt-6">
            <LangSwitch />
          </div>
          <div className="page-x mt-auto flex flex-col gap-3 pb-safe pt-8">
            <Link href="/order" onClick={() => setOpen(false)} className={buttonClass('primary', 'lg', 'w-full')}>
              {tc('cta')}
            </Link>
            {phone && (
              <a href={`tel:${phone}`} className={buttonClass('dark', 'lg', 'w-full')}>
                <Phone width={18} height={18} />
                {phoneLabel}
              </a>
            )}
            <a
              href={`https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 text-[14.5px] font-semibold text-white/70"
            >
              <Telegram width={18} height={18} />@{telegram}
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
