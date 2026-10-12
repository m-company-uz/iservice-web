import { getLocale, getTranslations } from 'next-intl/server';
import { MapLink } from '@/components/ui/map-link';
import { Telegram } from '@/components/ui/icons';
import { formatPhoneDisplay } from '@/lib/hours';
import type { Locale, SiteConfig } from '@/types/site';
import { LangSwitch } from './lang-switch';
import { Logo } from './logo';

/** Black footer = the "Контакты" anchor. All contact data from site config (DEV 3). */
export async function SiteFooter({ config }: { config: SiteConfig }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('footer');
  const label = 'text-[11px] font-bold uppercase tracking-[0.14em] text-white/45';

  return (
    <footer id="contacts" className="on-dark bg-night text-white">
      <div className="page-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:py-16">
        <div>
          <Logo className="h-9" />
          <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-white/55">{t('about')}</p>
        </div>
        <div>
          <h2 className={label}>{t('phones')}</h2>
          <ul className="mt-4 space-y-2.5">
            {config.branches
              .filter((b) => b.phone)
              .map((b) => (
                <li key={b.id}>
                  <a href={`tel:${b.phone}`} className="text-[16px] font-semibold tabular-nums hover:text-white/80">
                    {formatPhoneDisplay(b.phone!)}
                  </a>
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h2 className={label}>{t('branches')}</h2>
          <ul className="mt-4 space-y-2.5">
            {config.branches.map((b) => (
              <li key={b.id}>
                <MapLink
                  target={{ lat: b.latitude, lon: b.longitude, query: b.map_query, label: `i-Service ${b.name}` }}
                  className="text-[14.5px] text-white/75 underline-offset-4 hover:text-white hover:underline"
                >
                  {locale === 'ru' ? b.address_ru : b.address_uz}
                </MapLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className={label}>{t('telegram')}</h2>
          <a
            href={`https://t.me/${config.contacts.telegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-control border border-white/20 px-4 text-[14.5px] font-semibold hover:border-white/60"
          >
            <Telegram width={18} height={18} />@{config.contacts.telegram}
          </a>
        </div>
      </div>
      <div className="page-x flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6 text-[13px] text-white/45">
        <p>{t('rights', { year: new Date().getFullYear() })}</p>
        <LangSwitch />
      </div>
    </footer>
  );
}
