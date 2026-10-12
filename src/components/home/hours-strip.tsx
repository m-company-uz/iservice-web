import { getTranslations } from 'next-intl/server';
import { overallHours } from '@/lib/hours';
import type { SiteConfig } from '@/types/site';

/** The red band, built from config (§7.2): union of days, earliest open → latest close. */
export async function HoursStrip({ config }: { config: SiteConfig }) {
  const t = await getTranslations('common');
  const th = await getTranslations('home');
  const hours = overallHours(config.branches, t('days').split(','), t('everyDay'));
  if (!hours) return null;
  return (
    <div className="bg-brand text-white">
      <p className="page-x eyebrow py-3.5 text-[12px] tracking-[0.14em] md:py-4">
        <span className="sr-only">{th('hours')}: </span>
        {hours}
      </p>
    </div>
  );
}
