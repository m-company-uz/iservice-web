import type { SiteBranch } from '@/types/site';

/**
 * Booking days and time slots (DEV note 7, §9.4). All maths runs in Asia/Tashkent, never the
 * visitor's device zone. Tashkent is UTC+05:00 all year (no DST since 1992), which is why the
 * wire format can carry a fixed `+05:00`.
 */

export const TZ = 'Asia/Tashkent';
export const TZ_OFFSET = '+05:00';
/** Today's slots closer than this are not offered. */
export const LEAD_MINUTES = 60;

export interface TashkentClock {
  /** `YYYY-MM-DD` in Tashkent. */
  date: string;
  /** Minutes since Tashkent midnight. */
  minutes: number;
}

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function tashkentClock(now: Date): TashkentClock {
  const p = Object.fromEntries(partsFmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Calendar arithmetic on a `YYYY-MM-DD` (UTC midnight, so no zone can shift it). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday, Mon = 1 … Sun = 7. */
export function isoWeekday(date: string): number {
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export interface BookingDay {
  date: string;
  weekday: number;
  /** Slots that may still be picked on this day. Never empty. */
  slots: string[];
}

type BranchHours = Pick<SiteBranch, 'work_days' | 'opens_at' | 'closes_at'>;

/** A slot is offered when at least one of the candidate branches is open at that time on that day. */
function slotsForDay(weekday: number, slots: string[], branches: BranchHours[]): string[] {
  return slots.filter((s) => {
    const m = toMinutes(s);
    return branches.some(
      (b) => b.work_days.includes(weekday) && m >= toMinutes(b.opens_at) && m < toMinutes(b.closes_at),
    );
  });
}

/**
 * The next `count` working days with at least one free slot. `branches` is the chosen branch,
 * or all of them when none is chosen (a day counts if any branch works it).
 */
export function bookingDays(now: Date, branches: BranchHours[], slots: string[], count: number): BookingDay[] {
  const clock = tashkentClock(now);
  const out: BookingDay[] = [];
  // Look ahead far enough to find `count` working days even with long closures.
  for (let i = 0; out.length < count && i < count * 3 + 7; i++) {
    const date = addDays(clock.date, i);
    const weekday = isoWeekday(date);
    let free = slotsForDay(weekday, slots, branches);
    if (i === 0) free = free.filter((s) => toMinutes(s) >= clock.minutes + LEAD_MINUTES);
    if (free.length > 0) out.push({ date, weekday, slots: free });
  }
  return out;
}

/** `2026-10-09` + `10:00` → `2026-10-09T10:00:00+05:00`. */
export const toPreferredAt = (date: string, slot: string): string => `${date}T${slot}:00${TZ_OFFSET}`;

/** Server-side guard (§9.4): in the future and at most 30 days ahead. */
export function isAcceptablePreferredAt(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t > now.getTime() && t <= now.getTime() + 30 * 24 * 60 * 60 * 1000;
}
