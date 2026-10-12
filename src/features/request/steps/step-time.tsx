'use client';

import { memo, useEffect, useMemo } from 'react';
import { useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ChevronDown } from '@/components/ui/icons';
import { formatBranchHours } from '@/lib/hours';
import type { SiteConfig } from '@/types/site';
import { LIMITS, stepFields, type RequestFormValues } from '../schema';
import { addDays, bookingDays, tashkentClock } from '../slots';
import { ChoiceCard, ChoiceGroup, Chip, ErrorText, Field, inputClass } from '../ui';

/**
 * Branch, preferred date and slot (§9.4). `now` is null until mounted, so the server render
 * never disagrees with the client about which slots are still open.
 */
export const StepTime = memo(function StepTime({ config, now, form }: {
  config: SiteConfig;
  now: Date | null;
  form: UseFormReturn<RequestFormValues>;
}) {
  const t = useTranslations('request');
  const tc = useTranslations('common');
  const { register, setValue, getValues, control } = form;
  const { errors } = useFormState({ control, name: stepFields[2] });
  const [branchId, date] = useWatch({ control, name: ['branch_id', 'date'] });
  const dayNames = tc('days').split(',');

  const days = useMemo(() => {
    if (!now) return [];
    const chosen = config.branches.filter((b) => b.id === branchId);
    return bookingDays(now, chosen.length ? chosen : config.branches, config.slots, config.booking_days);
  }, [now, branchId, config]);
  const day = days.find((d) => d.date === date);

  // A branch or date change can make the earlier pick impossible; drop it rather than send it.
  useEffect(() => {
    if (!now) return;
    if (date && !day) {
      setValue('date', '', { shouldDirty: true });
      setValue('time', '', { shouldDirty: true });
    } else if (day && getValues('time') && !day.slots.includes(getValues('time'))) {
      setValue('time', '', { shouldDirty: true });
    }
  }, [now, date, day, getValues, setValue]);

  const today = now ? tashkentClock(now).date : '';
  const dateLabel = (d: { date: string; weekday: number }) => {
    const [y, m, dd] = d.date.split('-');
    const rel = d.date === today ? ` · ${t('dates.today')}` : d.date === addDays(today, 1) ? ` · ${t('dates.tomorrow')}` : '';
    return `${dayNames[d.weekday - 1]}, ${dd}.${m}.${y}${rel}`;
  };
  const err = (k: keyof RequestFormValues) => {
    const m = errors[k]?.message;
    return m ? t(`errors.${m}` as 'errors.invalid') : undefined;
  };

  return (
    <div className="space-y-6">
      <ChoiceGroup legend={t('fields.branch')} optional error={err('branch_id')} errorId="branch_id-error">
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 sm:gap-3">
          {config.branches.map((b) => (
            <ChoiceCard
              key={b.id}
              value={b.id}
              title={b.name}
              note={t('fields.branchHours', { hours: formatBranchHours(b, dayNames, tc('everyDay')) })}
              {...register('branch_id')}
            />
          ))}
          <ChoiceCard value="" title={t('fields.branchAny')} note={t('fields.branchAnyNote')} {...register('branch_id')} />
        </div>
      </ChoiceGroup>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)] sm:gap-4">
        <Field id="date" label={t('fields.date')} optional>
          <div className="relative">
            <select id="date" className={`${inputClass(false)} h-12 appearance-none pr-10 tabular-nums`} {...register('date')}>
              <option value="">{t('fields.datePlaceholder')}</option>
              {days.map((d) => (
                <option key={d.date} value={d.date}>
                  {dateLabel(d)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
          </div>
        </Field>

        <fieldset aria-describedby={errors.time ? 'time-error' : !date ? 'time-hint' : undefined}>
          <legend className="text-[13.5px] font-semibold text-ink">{t('fields.time')}</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {config.slots.map((s) => (
              <Chip
                key={s}
                value={s}
                disabled={!day || !day.slots.includes(s)}
                invalid={Boolean(errors.time)}
                className="[&>span]:px-1 [&>span]:tabular-nums"
                {...register('time')}
              >
                {s}
              </Chip>
            ))}
          </div>
          {!date && !errors.time && (
            <p id="time-hint" className="mt-1.5 text-[12.5px] text-muted">
              {t('fields.timeHint')}
            </p>
          )}
          <ErrorText id="time-error" message={err('time')} />
        </fieldset>
      </div>

      <Field id="comment" label={t('fields.comment')} optional error={err('comment')}>
        <textarea
          id="comment"
          rows={3}
          maxLength={LIMITS.comment}
          placeholder={t('fields.commentPlaceholder')}
          aria-invalid={Boolean(errors.comment)}
          className={`${inputClass(Boolean(errors.comment))} resize-y py-3`}
          {...register('comment')}
        />
      </Field>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand"
            {...register('consent')}
          />
          <span className="text-[13.5px] leading-relaxed text-body-soft">{t('fields.consent')}</span>
        </label>
        <ErrorText id="consent-error" message={err('consent')} />
      </div>

      {/* Honeypot (§9.6): off-screen, out of the tab order, hidden from assistive tech. */}
      <div aria-hidden className="absolute -left-[10000px] top-auto size-px overflow-hidden">
        <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
    </div>
  );
});
