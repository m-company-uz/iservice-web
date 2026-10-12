import type { SiteBranch } from '@/types/site';

/**
 * Formats ISO weekdays as runs: [1..6] → "Пн–Сб", [1,2,3,5] → "Пн–Ср, Пт".
 * `names` is the locale's 7 short names, Monday first. All seven → `everyDay`.
 */
export function formatDays(days: number[], names: string[], everyDay: string): string {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (sorted.length === 7) return everyDay;
  const runs: Array<[number, number]> = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d;
    else runs.push([d, d]);
  }
  const name = (d: number) => names[d - 1] ?? '';
  return runs
    .map(([a, b]) => (a === b ? name(a) : b === a + 1 ? `${name(a)}, ${name(b)}` : `${name(a)}–${name(b)}`))
    .join(', ');
}

export function formatBranchHours(b: Pick<SiteBranch, 'work_days' | 'opens_at' | 'closes_at'>, names: string[], everyDay: string): string {
  return `${formatDays(b.work_days, names, everyDay)} ${b.opens_at}–${b.closes_at}`;
}

/**
 * The red strip: one line for all branches. If they differ, the union of days and the
 * earliest opening to the latest closing (§7.2).
 */
export function overallHours(branches: SiteBranch[], names: string[], everyDay: string): string | null {
  if (branches.length === 0) return null;
  const days = branches.flatMap((b) => b.work_days);
  const opens = branches.map((b) => b.opens_at).sort()[0]!;
  const closes = branches.map((b) => b.closes_at).sort().at(-1)!;
  return `${formatDays(days, names, everyDay)} ${opens}–${closes}`;
}

/** The number the site's single "call us" buttons dial: the first branch that has one. */
export function firstPhone(config: { branches: Array<{ phone: string | null }> }): string | null {
  return config.branches.find((b) => b.phone)?.phone ?? null;
}

/** "+998983114646" → "+998 98 311-46-46" (display only; links keep E.164). */
export function formatPhoneDisplay(e164: string): string {
  const m = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+998 ${m[1]} ${m[2]}-${m[3]}-${m[4]}` : e164;
}
