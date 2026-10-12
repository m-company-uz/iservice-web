'use client';

import { memo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import type { Locale, SiteConfig } from '@/types/site';
import { findBrand, findCategory, labelOf } from './labels';
import type { RequestFormValues } from './schema';

const WATCHED = ['device_type', 'device_brand', 'device_model', 'category', 'defect', 'client_name', 'phone'] as const;

/** "Ваша заявка" — subscribes only to the fields it shows, so typing elsewhere never re-renders it. */
export const SummaryCard = memo(function SummaryCard({ config, control, className }: {
  config: SiteConfig;
  control: Control<RequestFormValues>;
  className?: string;
}) {
  const t = useTranslations('request');
  const locale = useLocale() as Locale;
  const [type, brandCode, model, catCode, defect, name, phone] = useWatch({ control, name: WATCHED });
  const brand = brandCode ? findBrand(config.brands, brandCode) : undefined;
  const cat = catCode ? findCategory(config.categories, catCode) : undefined;

  const title = [brand && brand.code !== 'other' ? labelOf(brand, locale) : '', model.trim()].filter(Boolean).join(' ') || t(`deviceTypes.${type}`);
  const problem = [cat ? labelOf(cat, locale) : '', defect.trim()].filter(Boolean).join(' · ');
  const contact = [name.trim(), phone.replace(/^\+998\s*$/, '')].filter(Boolean).join(' · ');

  return (
    <div className={cn('rounded-card border border-dashed border-line-strong bg-white p-4', className)}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">{t('summary.label')}</p>
      <p className="mt-1.5 truncate font-display text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-1 line-clamp-2 text-[13px] text-muted">{problem || t('summary.empty')}</p>
      {contact && <p className="mt-0.5 truncate text-[13px] tabular-nums text-muted">{contact}</p>}
    </div>
  );
});
