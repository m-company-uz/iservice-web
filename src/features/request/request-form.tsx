'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFormState, type FieldErrors, type Resolver } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { Alert, ChevronLeft, Close, Phone, Spinner, Telegram } from '@/components/ui/icons';
import { firstPhone, formatPhoneDisplay } from '@/lib/hours';
import { cn } from '@/lib/cn';
import type { ApiErrorBody, Locale, SiteConfig } from '@/types/site';
import { captureLanding, clearDraft, loadDraft, readLanding, saveDraft, uuid } from './draft';
import { toE164 } from './phone';
import {
  emptyValues,
  ERROR_KEYS,
  fieldStep,
  stepFields,
  stepSchemas,
  wireToFormField,
  type RequestBody,
  type RequestFormValues,
  type StepIndex,
} from './schema';
import { toPreferredAt } from './slots';
import { StepContacts } from './steps/step-contacts';
import { StepDevice } from './steps/step-device';
import { StepTime } from './steps/step-time';
import { StepRail } from './step-rail';
import { SummaryCard } from './summary-card';

type Status = 'idle' | 'sending' | 'unavailable' | 'rate_limited';

const STEPS: StepIndex[] = [0, 1, 2];
const clampStep = (n: number): StepIndex => (n >= 2 ? 2 : n <= 0 ? 0 : (n as StepIndex));

function stepFromUrl(): StepIndex {
  const n = Number(new URLSearchParams(window.location.search).get('step'));
  return Number.isFinite(n) ? clampStep(n - 1) : 0;
}

function urlForStep(step: StepIndex): string {
  const url = new URL(window.location.href);
  if (step === 0) url.searchParams.delete('step');
  else url.searchParams.set('step', String(step + 1));
  return url.pathname + url.search;
}

/**
 * Validates every step up to the current one (§9.2). Earlier steps matter on submit after a
 * deep link; later steps are never validated, so "Назад" never shows errors ahead.
 */
function stepResolver(stepRef: { current: StepIndex }): Resolver<RequestFormValues> {
  return async (raw) => {
    // An unpicked radio group reads as null in react-hook-form; the schemas speak ''.
    const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v ?? ''])) as RequestFormValues;
    const errors: FieldErrors<RequestFormValues> = {};
    for (let i = 0; i <= stepRef.current; i++) {
      const r = stepSchemas[i]!.safeParse(values);
      if (r.success) continue;
      for (const issue of r.error.issues) {
        const key = issue.path[0] as keyof RequestFormValues;
        errors[key] ??= { type: issue.code, message: ERROR_KEYS.has(issue.message) ? issue.message : 'invalid' };
      }
    }
    return Object.keys(errors).length ? { values: {}, errors } : { values, errors: {} };
  };
}

/** Fields whose rule depends on another field: changing the key re-checks these if in error. */
const RELATED: Partial<Record<keyof RequestFormValues, Array<keyof RequestFormValues>>> = {
  defect: ['category'],
  date: ['time'],
};

const firstErrorStep = (errors: FieldErrors<RequestFormValues>): StepIndex | null => {
  const steps = Object.keys(errors).map((k) => fieldStep[k]).filter((s): s is StepIndex => s !== undefined);
  return steps.length ? (Math.min(...steps) as StepIndex) : null;
};

export function RequestForm({ config }: { config: SiteConfig }) {
  const t = useTranslations('request');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [step, setStep] = useState<StepIndex>(0);
  const stepRef = useRef<StepIndex>(0);
  stepRef.current = step;
  const [showBanner, setShowBanner] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [now, setNow] = useState<Date | null>(null);
  const session = useRef<{ key: string; startedAt: number } | null>(null);
  const pushed = useRef(0);
  const mounted = useRef(false);
  const headings = useRef<Array<HTMLHeadingElement | null>>([]);

  const resolver = useMemo(() => stepResolver(stepRef), []);
  const form = useForm<RequestFormValues>({
    defaultValues: emptyValues,
    resolver,
    // Errors on blur; once touched, re-checked as the visitor types (DEV 6).
    mode: 'onTouched',
    shouldFocusError: false,
  });
  // Only the banner needs errors here; the steps subscribe to their own fields.
  const { errors } = useFormState({ control: form.control });

  // Restore the draft, honour ?step= (only if the earlier steps are valid), note the landing.
  useEffect(() => {
    captureLanding();
    const draft = loadDraft();
    const values = { ...emptyValues, ...draft?.values, website: '' };
    if (draft) form.reset(values);
    session.current = draft ? { key: draft.key, startedAt: draft.startedAt } : { key: uuid(), startedAt: Date.now() };

    let target = stepFromUrl();
    for (let i = 0; i < target; i++) {
      if (!stepSchemas[i]!.safeParse(values).success) {
        target = i as StepIndex;
        break;
      }
    }
    window.history.replaceState(null, '', urlForStep(target));
    setStep(target);
    setNow(new Date());
  }, [form]);

  // The phone's hardware Back moves between steps instead of leaving the form.
  useEffect(() => {
    const onPop = () => {
      pushed.current = Math.max(0, pushed.current - 1);
      setStep(stepFromUrl());
      setShowBanner(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Debounced draft save in idle time (§11.2), and re-validation of fields already in error.
  // Subscribes without re-rendering the form.
  useEffect(() => {
    let timer: number | undefined;
    const sub = form.watch((values, { name }) => {
      if (name) {
        const f = name as keyof RequestFormValues;
        const check = [f, ...(RELATED[f] ?? [])].filter((x) => form.getFieldState(x).error);
        if (check.length) void form.trigger(check);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const save = () => session.current && saveDraft({ values, ...session.current });
        if ('requestIdleCallback' in window) window.requestIdleCallback(save, { timeout: 1000 });
        else save();
      }, 500);
    });
    return () => {
      sub.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [form]);

  // Focus the new step's heading (announced by the live region), without a scroll jump.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (step === 2) setNow(new Date()); // slots must not go stale while the tab sat open
    window.scrollTo({ top: 0 });
    headings.current[step]?.focus({ preventScroll: true });
  }, [step]);

  const goTo = useCallback((next: StepIndex) => {
    window.history.pushState(null, '', urlForStep(next));
    pushed.current += 1;
    setStep(next);
    setShowBanner(false);
    setStatus((st) => (st === 'sending' ? st : 'idle'));
  }, []);

  const back = () => {
    if (step === 0) return;
    if (pushed.current > 0) window.history.back();
    else {
      const prev = clampStep(step - 1);
      window.history.replaceState(null, '', urlForStep(prev));
      setStep(prev);
      setShowBanner(false);
    }
  };

  const focusFirstInvalid = (s: StepIndex) => {
    const field = stepFields[s]!.find((f) => form.getFieldState(f).error);
    if (field) form.setFocus(field);
  };

  const onNext = async () => {
    const ok = await form.trigger(stepFields[step], { shouldFocus: false });
    if (ok) return goTo(clampStep(step + 1));
    setShowBanner(true);
    focusFirstInvalid(step);
  };

  const submit = form.handleSubmit(
    async (v) => {
      setStatus('sending');
      const landing = readLanding();
      const s = session.current ?? { key: uuid(), startedAt: Date.now() };
      const body: RequestBody = {
        idempotency_key: s.key,
        locale,
        client_name: v.client_name,
        phone: toE164(v.phone) ?? v.phone,
        channel: v.channel,
        device_type: v.device_type,
        device_brand: v.device_brand,
        device_model: v.device_model,
        category: v.category,
        defect: v.defect,
        branch_id: v.branch_id,
        preferred_at: v.date && v.time ? toPreferredAt(v.date, v.time) : null,
        comment: v.comment,
        consent: true,
        started_at: s.startedAt,
        website: v.website,
        referrer: landing.referrer,
        utm: landing.utm,
      };

      let res: Response;
      try {
        res = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        setStatus('unavailable');
        return;
      }

      if (res.status === 200 || res.status === 201) {
        const data = (await res.json().catch(() => ({}))) as { request_number?: number | null };
        clearDraft();
        const n = typeof data.request_number === 'number' ? `&n=${data.request_number}` : '';
        router.push(`/?sent=1${n}`);
        return; // stay "sending" until the home page replaces this one
      }
      if (res.status === 422) {
        const fields = ((await res.json().catch(() => null)) as ApiErrorBody | null)?.error?.fields ?? {};
        let earliest: StepIndex | null = null;
        for (const [wire, code] of Object.entries(fields)) {
          const field = wireToFormField[wire];
          if (!field) continue;
          form.setError(field, { type: 'server', message: code === 'category_or_defect' || code === 'phone_invalid' ? code : 'invalid' });
          const s2 = fieldStep[field]!;
          earliest = earliest === null ? s2 : (Math.min(earliest, s2) as StepIndex);
        }
        setStatus('idle');
        setShowBanner(true);
        if (earliest !== null && earliest !== step) goTo(earliest);
        return;
      }
      setStatus(res.status === 429 ? 'rate_limited' : 'unavailable');
    },
    (errs) => {
      const first = firstErrorStep(errs);
      if (first !== null && first < step) goTo(first);
      setShowBanner(true);
      focusFirstInvalid(first ?? step);
    },
  );

  const invalidCount = stepFields[step]!.filter((f) => errors[f]).length;
  const sending = status === 'sending';
  const callPhone = firstPhone(config);
  const primaryLabel = step < 2 ? t('next') : sending ? t('sending') : t('submit');

  return (
    <>
      <div className="page-x grid gap-8 pb-28 pt-4 md:grid-cols-[260px_minmax(0,1fr)] md:pb-16 md:pt-12 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-10">
        {/* Desktop: title, step rail and the running summary. */}
        <aside className="hidden md:block">
          <h1 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink lg:text-[34px]">
            {t('title')}
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{t('sub')}</p>
          <div className="mt-7">
            <StepRail step={step} />
          </div>
          {step > 0 && <SummaryCard config={config} control={form.control} className="mt-6" />}
        </aside>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 2) void onNext();
            else void submit(e);
          }}
          className="min-w-0 md:rounded-[20px] md:border md:border-line md:bg-white md:p-8 lg:p-10"
        >
          {/* Phone: back/close + step counter, as drawn in §04. */}
          <div className="flex h-10 items-center justify-between md:hidden">
            {step === 0 ? (
              <Link href="/" aria-label={t('close')} className="-ml-2 flex size-10 items-center justify-center text-ink">
                <Close />
              </Link>
            ) : (
              <button type="button" onClick={back} className="-ml-1 flex items-center gap-1 text-[14.5px] font-medium text-body">
                <ChevronLeft width={18} height={18} />
                {t('back')}
              </button>
            )}
            <span className="text-[13px] text-muted">{t('stepOf', { step: step + 1 })}</span>
          </div>

          <p aria-live="polite" className="sr-only">
            {t('stepOf', { step: step + 1 })}
          </p>

          {STEPS.map((s) => (
            <section key={s} hidden={s !== step} aria-labelledby={`step-${s}-title`}>
              <h2
                id={`step-${s}-title`}
                ref={(el) => {
                  headings.current[s] = el;
                }}
                tabIndex={-1}
                className="mt-2 font-display text-[24px] font-extrabold leading-[1.12] tracking-[-0.02em] text-ink outline-none md:mt-0 md:text-[24px] md:font-bold"
              >
                {t(`headings.${(s + 1) as 1 | 2 | 3}`)}
              </h2>
              <p className="mt-1.5 hidden text-[13px] text-muted md:block">{t('stepOf', { step: s + 1 })}</p>

              {/* Phone progress: three segments. */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 md:hidden" aria-hidden>
                {STEPS.map((i) => (
                  <span key={i} className={cn('h-[3px] rounded-full', i <= s ? 'bg-brand' : 'bg-line')} />
                ))}
              </div>
              <div className="my-6 hidden h-px bg-line md:block" />

              {s > 0 && <SummaryCard config={config} control={form.control} className="mt-5 border-solid bg-surface-3 md:hidden" />}

              {showBanner && invalidCount > 0 && s === step && (
                <button
                  type="button"
                  onClick={() => focusFirstInvalid(step)}
                  className="mt-5 flex w-full items-start gap-2.5 rounded-control border border-danger-border bg-danger-bg p-3.5 text-left text-[14px] font-medium text-danger md:mt-0 md:mb-6"
                >
                  <Alert width={18} height={18} className="mt-px shrink-0" />
                  {t('errors.banner', { count: invalidCount })}
                </button>
              )}

              <div className="mt-6 md:mt-0">
                {s === 0 && <StepDevice config={config} form={form} />}
                {s === 1 && <StepContacts form={form} />}
                {s === 2 && <StepTime config={config} now={now} form={form} />}
              </div>
            </section>
          ))}

          {(status === 'unavailable' || status === 'rate_limited') && (
            <div role="alert" className="mt-6 rounded-control border border-danger-border bg-danger-bg p-4">
              <p className="flex items-start gap-2 text-[14.5px] font-semibold text-danger">
                <Alert width={18} height={18} className="mt-px shrink-0" />
                {status === 'unavailable' ? t('errors.unavailableTitle') : t('errors.rateLimitedTitle')}
              </p>
              <p className="mt-1 pl-[26px] text-[13.5px] text-body">
                {status === 'unavailable' ? t('errors.unavailable') : t('errors.rateLimited')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 pl-[26px]">
                {status === 'unavailable' && (
                  <button type="submit" className={buttonClass('primary', 'md', 'shadow-none')}>
                    {t('errors.retry')}
                  </button>
                )}
                {callPhone && (
                  <a href={`tel:${callPhone}`} className={buttonClass('outline', 'md', 'tabular-nums')}>
                    <Phone width={16} height={16} />
                    {formatPhoneDisplay(callPhone)}
                  </a>
                )}
                <a
                  href={`https://t.me/${config.contacts.telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass('outline', 'md')}
                >
                  <Telegram width={16} height={16} />
                  {tc('telegram')}
                </a>
              </div>
            </div>
          )}

          {/* Actions: inline on desktop, a sticky bottom bar on phones (§7.3). */}
          <div className="mt-8 hidden items-center justify-between gap-4 border-t border-line pt-6 md:flex">
            {step === 0 ? (
              <p className="text-[13px] text-muted">{t('required')}</p>
            ) : (
              <button type="button" onClick={back} className={buttonClass('outline', 'md')}>
                {t('back')}
              </button>
            )}
            <button type="submit" disabled={sending} aria-busy={sending} className={buttonClass('primary', 'md', 'min-w-[140px]')}>
              {sending && <Spinner width={18} height={18} />}
              {primaryLabel}
            </button>
          </div>
          <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white px-4 pt-3 md:hidden">
            <button type="submit" disabled={sending} aria-busy={sending} className={buttonClass('primary', 'lg', 'w-full')}>
              {sending && <Spinner width={18} height={18} />}
              {primaryLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
