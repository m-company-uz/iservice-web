import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { firstPhone, formatPhoneDisplay } from '@/lib/hours';
import type { SiteConfig } from '@/types/site';
import { LangSwitch } from './lang-switch';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';

/** Black header (§7.1). Anchors are full paths, so they work from any page without JavaScript. */
export async function SiteHeader({ config }: { config: SiteConfig }) {
  const locale = await getLocale();
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');
  const links = [
    { href: `/${locale}#services`, label: t('services') },
    { href: `/${locale}#how`, label: t('how') },
    { href: `/${locale}#branches`, label: t('branches') },
    { href: `/${locale}#contacts`, label: t('contacts') },
  ];
  const phone = firstPhone(config);

  return (
    <header className="on-dark sticky top-0 z-40 bg-night text-white">
      <div className="page-x flex h-16 items-center md:h-[76px]">
        <Link href="/" aria-label={`i-Service — ${tc('home')}`} className="shrink-0">
          <Logo priority className="h-8 md:h-10" />
        </Link>
        <nav aria-label={t('label')} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-7">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-[14.5px] font-medium text-white/80 transition-colors hover:text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <LangSwitch className="ml-auto lg:ml-8" />
        <Link href="/order" className={buttonClass('primary', 'md', 'ml-4 hidden shadow-none md:inline-flex')}>
          {tc('cta')}
        </Link>
        <MobileMenu
          links={links}
          phone={phone}
          phoneLabel={phone ? formatPhoneDisplay(phone) : null}
          telegram={config.contacts.telegram}
        />
      </div>
    </header>
  );
}
