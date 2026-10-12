import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows N per 10 minutes, then recovers', () => {
    const l = new RateLimiter({ per10Min: 2, perDay: 10 });
    const t = 1_000_000;
    expect(l.take('ip', t)).toBe(true);
    expect(l.take('ip', t + 1)).toBe(true);
    expect(l.take('ip', t + 2)).toBe(false);
    expect(l.take('other', t + 2)).toBe(true);
    expect(l.take('ip', t + 10 * 60 * 1000 + 1)).toBe(true);
  });
  it('caps per day', () => {
    const l = new RateLimiter({ per10Min: 100, perDay: 3 });
    const t = 5_000_000;
    [0, 1, 2].forEach((i) => expect(l.take('ip', t + i * 11 * 60 * 1000)).toBe(true));
    expect(l.take('ip', t + 3 * 11 * 60 * 1000)).toBe(false);
    expect(l.take('ip', t + 25 * 60 * 60 * 1000)).toBe(true);
  });
});
