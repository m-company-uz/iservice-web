'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, Check } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Form building blocks. Errors always come with the "!" icon and text, and focus is always a
 * black outline, because the error red is close to the brand red (DEV 6).
 */

export const inputClass = (invalid: boolean) =>
  cn(
    // 16 px text: iOS zooms into anything smaller on focus.
    'w-full rounded-control border bg-white px-3.5 text-[16px] text-ink placeholder:text-faint',
    'transition-colors focus-visible:border-ink',
    invalid ? 'border-danger bg-danger-bg' : 'border-line-strong hover:border-faint',
  );

export function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[13.5px] font-medium leading-snug text-danger">
      <Alert width={16} height={16} className="mt-px shrink-0" />
      {message}
    </p>
  );
}

export function Field({ id, label, optional, error, children, className }: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('request.fields');
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13.5px] font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> · {t('optional')}</span>}
      </label>
      <div className="mt-2">{children}</div>
      <ErrorText id={`${id}-error`} message={error} />
    </div>
  );
}

/** A native radio group: arrow keys and screen-reader semantics come for free (§11.3). */
export function ChoiceGroup({ legend, optional, error, errorId, children, className }: {
  legend: string;
  optional?: boolean;
  error?: string;
  errorId: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('request.fields');
  return (
    <fieldset className={className} aria-describedby={error ? errorId : undefined}>
      <legend className="text-[13.5px] font-semibold text-ink">
        {legend}
        {optional && <span className="font-normal text-muted"> · {t('optional')}</span>}
      </legend>
      {children}
      <ErrorText id={errorId} message={error} />
    </fieldset>
  );
}

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>;

const radioFace =
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ' +
  'peer-checked:border-brand peer-checked:bg-brand-tint peer-disabled:cursor-not-allowed peer-disabled:opacity-40';

/** Pill chip (defect category, device type, time slot). */
export function Chip({ children, invalid, className, ...input }: RadioProps & { children: ReactNode; invalid?: boolean; className?: string }) {
  return (
    <label className={cn('relative', className)}>
      <input type="radio" className="peer sr-only" {...input} />
      <span
        className={cn(
          'flex h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-control border bg-white px-4 text-[14.5px] font-medium text-ink transition-colors hover:border-faint',
          invalid ? 'border-danger' : 'border-line-strong',
          radioFace,
        )}
      >
        {children}
      </span>
    </label>
  );
}

/** Larger card radio with a title and a note (contact channel, branch). */
export function ChoiceCard({ title, note, ...input }: RadioProps & { title: ReactNode; note?: ReactNode }) {
  return (
    <label className="relative block">
      <input type="radio" className="peer sr-only" {...input} />
      <span
        className={cn(
          'flex min-h-[64px] cursor-pointer items-center gap-3 rounded-control border border-line-strong bg-white px-4 py-3 transition-colors hover:border-faint',
          '[&_.tick]:opacity-0 peer-checked:[&_.tick]:opacity-100',
          radioFace,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          {note && <span className="mt-0.5 block text-[12.5px] text-muted">{note}</span>}
        </span>
        <span className="tick flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-opacity">
          <Check width={12} height={12} />
        </span>
      </span>
    </label>
  );
}
