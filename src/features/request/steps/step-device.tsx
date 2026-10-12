'use client';

import { memo, useEffect } from 'react';
import { useFormState, useWatch, type UseFormReturn } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown } from '@/components/ui/icons';
import { DEVICE_TYPES, type Locale, type SiteConfig } from '@/types/site';
import { hasBrands, labelOf } from '../labels';
import { LIMITS, stepFields, type RequestFormValues } from '../schema';
import { ChoiceGroup, Chip, Field, inputClass } from '../ui';

export const StepDevice = memo(function StepDevice({ config, form }: { config: SiteConfig; form: UseFormReturn<RequestFormValues> }) {
  const t = useTranslations('request');
  const locale = useLocale() as Locale;
  const { register, setValue, getValues, control } = form;
  const { errors } = useFormState({ control, name: stepFields[0] });
  const deviceType = useWatch({ control, name: 'device_type' });
  const categories = config.categories.filter((c) => c.device_types.includes(deviceType));
  const err = (k: keyof RequestFormValues) => {
    const m = errors[k]?.message;
    return m ? t(`errors.${m}` as 'errors.invalid') : undefined;
  };

  // Switching device type drops choices that don't apply to it.
  useEffect(() => {
    const cat = getValues('category');
    if (cat && !config.categories.some((c) => c.code === cat && c.device_types.includes(deviceType))) {
      setValue('category', '', { shouldDirty: true });
    }
    if (!hasBrands(deviceType) && getValues('device_brand')) setValue('device_brand', '', { shouldDirty: true });
  }, [deviceType, config.categories, getValues, setValue]);

  return (
    <div className="space-y-6">
      <ChoiceGroup legend={t('fields.deviceType')} errorId="device_type-error">
        <div className="mt-2.5 flex flex-wrap gap-2">
          {DEVICE_TYPES.map((d) => (
            <Chip key={d} value={d} {...register('device_type')}>
              {t(`deviceTypes.${d}`)}
            </Chip>
          ))}
        </div>
      </ChoiceGroup>

      <ChoiceGroup legend={t('fields.category')} error={err('category')} errorId="category-error">
        <div className="mt-2.5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c.code} value={c.code} invalid={Boolean(errors.category)} {...register('category')}>
              {labelOf(c, locale)}
            </Chip>
          ))}
        </div>
      </ChoiceGroup>

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
        {hasBrands(deviceType) && (
          <Field id="device_brand" label={t('fields.brand')} optional>
            <div className="relative">
              <select id="device_brand" className={`${inputClass(false)} h-12 appearance-none pr-10`} {...register('device_brand')}>
                <option value="">{t('fields.brandPlaceholder')}</option>
                {config.brands.map((b) => (
                  <option key={b.code} value={b.code}>
                    {labelOf(b, locale)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
            </div>
          </Field>
        )}
        <Field
          id="device_model"
          label={t('fields.model')}
          optional
          error={err('device_model')}
          className={hasBrands(deviceType) ? undefined : 'sm:col-span-2'}
        >
          <input
            id="device_model"
            type="text"
            autoComplete="off"
            maxLength={LIMITS.model}
            placeholder={hasBrands(deviceType) ? t('fields.modelPlaceholderPhone') : t('fields.modelPlaceholderComputer')}
            aria-invalid={Boolean(errors.device_model)}
            aria-describedby={errors.device_model ? 'device_model-error' : undefined}
            className={`${inputClass(Boolean(errors.device_model))} h-12`}
            {...register('device_model')}
          />
        </Field>
      </div>

      <Field id="defect" label={t('fields.defect')} error={err('defect')}>
        <textarea
          id="defect"
          rows={4}
          maxLength={LIMITS.defect}
          placeholder={t('fields.defectPlaceholder')}
          aria-invalid={Boolean(errors.defect)}
          aria-describedby={errors.defect ? 'defect-error' : undefined}
          className={`${inputClass(Boolean(errors.defect))} resize-y py-3`}
          {...register('defect')}
        />
      </Field>
    </div>
  );
});
