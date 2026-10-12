'use client';

import { memo, type ChangeEvent, type FocusEvent } from 'react';
import { useFormState, type UseFormReturn } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { CONTACT_CHANNELS } from '@/types/site';
import { caretAfterDigits, formatPhoneInput, nationalDigits } from '../phone';
import { LIMITS, stepFields, type RequestFormValues } from '../schema';
import { ChoiceCard, ChoiceGroup, Field, inputClass } from '../ui';

export const StepContacts = memo(function StepContacts({ form }: { form: UseFormReturn<RequestFormValues> }) {
  const t = useTranslations('request');
  const { register, control } = form;
  const { errors } = useFormState({ control, name: stepFields[1] });
  const err = (k: keyof RequestFormValues) => {
    const m = errors[k]?.message;
    return m ? t(`errors.${m}` as 'errors.invalid') : undefined;
  };
  const phone = register('phone');

  /**
   * Live mask on the input's own value: no re-render, no library (§11.2). The caret stays
   * after the same digit it followed, so editing mid-number doesn't jump to the end.
   */
  const onPhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBefore = nationalDigits(el.value.slice(0, caret)).length;
    const formatted = formatPhoneInput(el.value);
    if (formatted !== el.value) {
      el.value = formatted;
      const pos = caretAfterDigits(formatted, digitsBefore);
      el.setSelectionRange(pos, pos);
    }
    return phone.onChange(e);
  };

  const onPhoneFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '') e.target.value = '+998 ';
  };

  const onPhoneBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (nationalDigits(e.target.value) === '') e.target.value = '';
    return phone.onBlur(e);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
        <Field id="client_name" label={t('fields.name')} optional error={err('client_name')}>
          <input
            id="client_name"
            type="text"
            autoComplete="given-name"
            maxLength={LIMITS.name}
            placeholder={t('fields.namePlaceholder')}
            aria-invalid={Boolean(errors.client_name)}
            className={`${inputClass(Boolean(errors.client_name))} h-12`}
            {...register('client_name')}
          />
        </Field>
        <Field id="phone" label={t('fields.phone')} error={err('phone')}>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+998 90 123-45-67"
            aria-required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className={`${inputClass(Boolean(errors.phone))} h-12 tabular-nums`}
            {...phone}
            onChange={onPhoneChange}
            onFocus={onPhoneFocus}
            onBlur={onPhoneBlur}
          />
        </Field>
      </div>

      <ChoiceGroup legend={t('fields.channel')} errorId="channel-error">
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 sm:gap-3">
          {CONTACT_CHANNELS.map((c) => (
            <ChoiceCard key={c} value={c} title={t(`channels.${c}`)} note={t(`channels.${c}Note`)} {...register('channel')} />
          ))}
        </div>
      </ChoiceGroup>
    </div>
  );
});
