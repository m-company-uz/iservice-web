import { describe, expect, it } from 'vitest';
import { addDays, bookingDays, isAcceptablePreferredAt, isoWeekday, tashkentClock, toPreferredAt } from './slots';

const SLOTS = ['10:00', '12:00', '15:00', '18:00'];
const monSat = { work_days: [1, 2, 3, 4, 5, 6], opens_at: '10:00', closes_at: '20:00' };
const early = { work_days: [1, 2, 3, 4, 5, 6], opens_at: '09:00', closes_at: '21:30' };
const sundayOnly = { work_days: [7], opens_at: '10:00', closes_at: '20:00' };
/** UTC instant for a Tashkent wall-clock time (UTC+5). */
const tk = (iso: string) => new Date(`${iso}+05:00`);

describe('clock', () => {
  it('reads Tashkent time regardless of the host zone', () => {
    // 2026-10-10 20:30 UTC is already Sunday 01:30 in Tashkent.
    expect(tashkentClock(new Date('2026-10-10T20:30:00Z'))).toEqual({ date: '2026-10-11', minutes: 90 });
  });
  it('does calendar maths across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(isoWeekday('2026-10-11')).toBe(7); // Sunday
    expect(isoWeekday('2026-10-12')).toBe(1);
  });
});

describe('bookingDays', () => {
  it('skips non-working days and lists N working days', () => {
    const days = bookingDays(tk('2026-10-10T08:00:00'), [monSat], SLOTS, 14); // Saturday morning
    expect(days).toHaveLength(14);
    expect(days[0]).toMatchObject({ date: '2026-10-10', slots: SLOTS });
    expect(days.some((d) => d.weekday === 7)).toBe(false);
  });

  it('disables today’s slots closer than 60 minutes', () => {
    const [today] = bookingDays(tk('2026-10-12T11:05:00'), [monSat], SLOTS, 3);
    expect(today).toMatchObject({ date: '2026-10-12', slots: ['15:00', '18:00'] });
  });

  it('drops today when nothing is left', () => {
    const days = bookingDays(tk('2026-10-12T17:30:00'), [monSat], SLOTS, 3);
    expect(days[0]!.date).toBe('2026-10-13');
  });

  it('just after midnight offers the whole day', () => {
    const [first] = bookingDays(tk('2026-10-13T00:05:00'), [monSat], SLOTS, 1);
    expect(first).toMatchObject({ date: '2026-10-13', slots: SLOTS });
  });

  it('a day counts if any branch works it', () => {
    const days = bookingDays(tk('2026-10-10T08:00:00'), [monSat, sundayOnly], SLOTS, 3);
    expect(days.map((d) => d.date)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12']);
  });

  it('only offers slots inside opening hours', () => {
    const late = { work_days: [1, 2, 3, 4, 5, 6], opens_at: '11:00', closes_at: '16:00' };
    const [d] = bookingDays(tk('2026-10-12T00:00:00'), [late], SLOTS, 1);
    expect(d!.slots).toEqual(['12:00', '15:00']);
    const [e] = bookingDays(tk('2026-10-12T00:00:00'), [early], SLOTS, 1);
    expect(e!.slots).toEqual(SLOTS);
  });
});

describe('preferred_at', () => {
  it('serialises with the fixed Tashkent offset', () => {
    expect(toPreferredAt('2026-10-12', '10:00')).toBe('2026-10-12T10:00:00+05:00');
  });
  it('accepts only the future, at most 30 days ahead', () => {
    const now = tk('2026-10-12T09:00:00');
    expect(isAcceptablePreferredAt('2026-10-12T10:00:00+05:00', now)).toBe(true);
    expect(isAcceptablePreferredAt('2026-10-12T08:00:00+05:00', now)).toBe(false);
    expect(isAcceptablePreferredAt('2026-11-20T10:00:00+05:00', now)).toBe(false);
    expect(isAcceptablePreferredAt('nonsense', now)).toBe(false);
  });
});
