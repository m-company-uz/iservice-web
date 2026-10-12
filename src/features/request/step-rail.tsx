'use client';

import { useTranslations } from 'next-intl';
import { Check } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/** Desktop step rail (design §03). Done steps get the green tick, the current one is inverted. */
export function StepRail({ step }: { step: number }) {
  const t = useTranslations('request');
  return (
    <ol aria-label={t('stepsLabel')} className="space-y-1.5">
      {([1, 2, 3] as const).map((n, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li
            key={n}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn(
              'flex h-[50px] items-center gap-3 rounded-[12px] px-3.5 text-[14.5px]',
              state === 'current' ? 'bg-ink font-semibold text-white' : state === 'done' ? 'text-ink' : 'text-muted',
            )}
          >
            <span
              className={cn(
                'flex size-[26px] items-center justify-center rounded-[8px] text-[12.5px] font-bold',
                state === 'current' ? 'bg-brand text-white' : state === 'done' ? 'bg-success-bg text-success' : 'bg-surface-3 text-muted',
              )}
            >
              {state === 'done' ? <Check width={14} height={14} /> : n}
            </span>
            {t(`steps.${n}`)}
            {state === 'done' && <span className="sr-only">({t('stepDone')})</span>}
          </li>
        );
      })}
    </ol>
  );
}
