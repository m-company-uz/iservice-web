/**
 * In-memory sliding-window limiter per key (§9.6): N per 10 min and M per day.
 *
 * On Vercel each function instance has its own memory, so this is best effort — it stops a
 * single burst, not a distributed one. The CRM's per-phone cap is the authoritative limit.
 */

const TEN_MIN = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export interface Limits {
  per10Min: number;
  perDay: number;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(private readonly limits: Limits) {}

  /** Records a hit and returns true if it is allowed. Rejected hits are not recorded. */
  take(key: string, now = Date.now()): boolean {
    this.sweep(now);
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < DAY);
    const inTen = recent.filter((t) => now - t < TEN_MIN).length;
    if (inTen >= this.limits.per10Min || recent.length >= this.limits.perDay) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < TEN_MIN) return;
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= DAY)) this.hits.delete(key);
    }
  }
}
