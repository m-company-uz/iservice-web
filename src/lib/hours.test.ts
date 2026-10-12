import { describe, expect, it } from 'vitest';
import { formatDays, formatPhoneDisplay, overallHours } from './hours';

const RU = 'Пн,Вт,Ср,Чт,Пт,Сб,Вс'.split(',');
const b = (work_days: number[], opens_at: string, closes_at: string) => ({
  id: 'x', name: 'x', label_ru: 'x', label_uz: 'x', address_ru: 'x', address_uz: 'x', phone: '+998901234567',
  work_days, opens_at, closes_at, latitude: null, longitude: null, map_query: 'x',
});

describe('hours', () => {
  it('formats day runs', () => {
    expect(formatDays([1, 2, 3, 4, 5, 6], RU, 'Ежедневно')).toBe('Пн–Сб');
    expect(formatDays([1, 2, 3, 5], RU, 'Ежедневно')).toBe('Пн–Ср, Пт');
    expect(formatDays([6, 7], RU, 'Ежедневно')).toBe('Сб, Вс');
    expect(formatDays([1, 2, 3, 4, 5, 6, 7], RU, 'Ежедневно')).toBe('Ежедневно');
  });
  it('merges branches into one strip: earliest open to latest close', () => {
    expect(overallHours([b([1, 2, 3, 4, 5, 6], '09:00', '21:30'), b([1, 2, 3, 4, 5, 6], '10:00', '20:00')], RU, '')).toBe(
      'Пн–Сб 09:00–21:30',
    );
    expect(overallHours([], RU, '')).toBeNull();
  });
  it('formats phones for display', () => {
    expect(formatPhoneDisplay('+998983114646')).toBe('+998 98 311-46-46');
  });
});
