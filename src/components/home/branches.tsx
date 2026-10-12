import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { ArrowUpRight } from '@/components/ui/icons';
import { MapLink } from '@/components/ui/map-link';
import { formatBranchHours, formatPhoneDisplay } from '@/lib/hours';
import type { Locale, SiteBranch, SiteConfig } from '@/types/site';

/** Facade photos are static assets keyed by the branch's name slug (the CRM ids differ per database). */
const FACADES: Record<string, string> = {
  'aviasozlar-2-65': '/images/branch-aviasozlar-2-65.jpg',
  'aviasozlar-bozori': '/images/branch-aviasozlar-bozori.jpg',
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Branch cards (§7.2, DEV 2). The whole photo plus "Открыть на карте ↗" is one link that opens
 * the visitor's own map app (see `lib/maps.ts`). No embedded map.
 */
export async function Branches({ config }: { config: SiteConfig }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('home.branches');
  const tc = await getTranslations('common');
  const days = tc('days').split(',');

  const card = (b: SiteBranch, index: number) => {
    const label = locale === 'ru' ? b.label_ru : b.label_uz;
    const address = locale === 'ru' ? b.address_ru : b.address_uz;
    const photo = FACADES[slug(b.name)];
    return (
      <li key={b.id} className="overflow-hidden rounded-card border border-line bg-white">
        <MapLink
          target={{ lat: b.latitude, lon: b.longitude, query: b.map_query, label: `i-Service ${b.name}` }}
          ariaLabel={t('mapLinkLabel', { name: `${label}, ${b.name}` })}
          className="group relative block aspect-[16/9] bg-surface-2"
        >
          {photo && (
            <Image
              src={photo}
              alt={t('photoAlt', { name: b.name })}
              fill
              quality={60}
              sizes="(min-width: 1200px) 650px, (min-width: 834px) 46vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              // The first card is near the fold on desktop; both are lazy on phones.
              loading={index === 0 ? undefined : 'lazy'}
            />
          )}
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-[10px] bg-ink px-3 py-2 text-[13px] font-semibold text-white md:bottom-4 md:right-4">
            {t('openMap')}
            <ArrowUpRight width={15} height={15} />
          </span>
        </MapLink>
        <div className="p-5 md:p-6">
          <h3 className="font-display text-[19px] font-bold text-ink md:text-[21px]">
            {label} <span className="font-sans text-[15px] font-semibold text-muted">· {b.name}</span>
          </h3>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-body-soft">{address}</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
            {b.phone && (
              <div>
                <dt className="text-[12px] text-muted">{t('phone')}</dt>
                <dd className="mt-1">
                  <a href={`tel:${b.phone}`} className="text-[15px] font-semibold tabular-nums text-brand hover:text-brand-hover md:text-ink">
                    {formatPhoneDisplay(b.phone)}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[12px] text-muted">{t('hours')}</dt>
              <dd className="mt-1 text-[15px] font-semibold tabular-nums text-ink">
                {formatBranchHours(b, days, tc('everyDay'))}
              </dd>
            </div>
          </dl>
        </div>
      </li>
    );
  };

  return (
    <section id="branches" aria-labelledby="branches-title" className="page-x py-14 md:py-20 lg:py-24">
      <div className="flex items-end justify-between gap-6">
        <h2 id="branches-title" className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[42px]">
          {t('title')}
        </h2>
        <Link href="/order" className={buttonClass('outline', 'md', 'hidden md:inline-flex')}>
          {tc('cta')}
        </Link>
      </div>
      <ul className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-5">{config.branches.map(card)}</ul>
    </section>
  );
}
