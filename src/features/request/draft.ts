import type { RequestFormValues } from './schema';

/**
 * The draft lives in sessionStorage (§9.2): a reload or a failed submit keeps everything
 * (DEV 8); it is cleared on success. Storage can be missing or throw (private mode, quota),
 * so every access is guarded and the form works without it.
 */

const KEY = 'iservice:request-draft:v1';
const UTM_KEY = 'iservice:landing:v1';

export interface Draft {
  values: Partial<RequestFormValues>;
  /** Idempotency key: one per form session, so a double tap or a retry is safe end to end. */
  key: string;
  startedAt: number;
}

export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // randomUUID needs a secure context; plain-http LAN testing still gets a v4 UUID.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return typeof d.key === 'string' && typeof d.startedAt === 'number' && d.values ? d : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: Draft): void {
  try {
    const values = { ...d.values };
    delete values.website; // the honeypot never persists
    sessionStorage.setItem(KEY, JSON.stringify({ ...d, values }));
  } catch {
    /* storage unavailable: the form still works, it just won't survive a reload */
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* see saveDraft */
  }
}

export interface Landing {
  utm: { source: string | null; medium: string | null; campaign: string | null };
  referrer: string | null;
}

/**
 * Remembers the first landing's UTM tags and external referrer for this tab, so a visitor who
 * arrives from Instagram on the home page and opens the form later is still attributed.
 */
export function captureLanding(): void {
  try {
    if (sessionStorage.getItem(UTM_KEY)) return;
    const p = new URLSearchParams(window.location.search);
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : null;
    const landing: Landing = {
      utm: { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign') },
      referrer: ref ? ref.slice(0, 500) : null,
    };
    sessionStorage.setItem(UTM_KEY, JSON.stringify(landing));
  } catch {
    /* attribution is optional */
  }
}

export function readLanding(): Landing {
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    if (raw) return JSON.parse(raw) as Landing;
  } catch {
    /* fall through */
  }
  return { utm: { source: null, medium: null, campaign: null }, referrer: null };
}
