import 'server-only';
import { z } from 'zod';
import { env } from '@/lib/env';
import { DEVICE_TYPES } from '@/types/site';
import type { ApiErrorBody, SiteConfig, SiteRequestCreated, SiteRequestPayload } from '@/types/site';

/**
 * Server-to-server CRM client (DEVELOPMENT_PLAN §4.2, §10). The browser never talks to the CRM:
 * the key lives only here, and every call carries `X-Site-Key`.
 */

const CONFIG_TIMEOUT_MS = 4_000;
const SUBMIT_TIMEOUT_MS = 10_000;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** A branch photo's name as the CRM stores it: a UUID and `.jpg`, nothing a path could hide in. */
export const PHOTO_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

/** Guards against CRM drift: a config that doesn't parse is ignored in favour of the fallback. */
export const siteConfigSchema = z.object({
  branches: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      label_ru: z.string().min(1),
      label_uz: z.string().min(1),
      address_ru: z.string().min(1),
      address_uz: z.string().min(1),
      phone: z.string().regex(/^\+998\d{9}$/).nullable(),
      opens_at: hhmm,
      closes_at: hhmm,
      work_days: z.array(z.number().int().min(1).max(7)).min(1),
      latitude: z.number().min(-90).max(90).nullable(),
      longitude: z.number().min(-180).max(180).nullable(),
      map_query: z.string().min(1),
      photo_file: z.string().regex(PHOTO_FILE).nullable(),
    }),
  ),
  categories: z.array(
    z.object({
      code: z.string().min(1),
      label_ru: z.string().min(1),
      label_uz: z.string().min(1),
      device_types: z.array(z.enum(DEVICE_TYPES)).min(1),
    }),
  ),
  brands: z.array(
    z.object({
      code: z.string().min(1),
      label: z.string().optional(),
      label_ru: z.string().optional(),
      label_uz: z.string().optional(),
    }),
  ),
  slots: z.array(hhmm).min(1),
  booking_days: z.number().int().min(1).max(30),
  contacts: z.object({ telegram: z.string().min(1) }),
}) satisfies z.ZodType<SiteConfig>;

function headers(extra?: Record<string, string>): Record<string, string> {
  return { 'X-Site-Key': env.SITE_API_KEY ?? '', Accept: 'application/json', ...extra };
}

/** Throws on any failure; the caller decides what falling back means. */
export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (!env.CRM_API_URL || !env.SITE_API_KEY) throw new Error('crm: not configured');
  const res = await fetch(`${env.CRM_API_URL}/site/config`, {
    headers: headers(),
    signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`crm: GET /site/config → ${res.status}`);
  return siteConfigSchema.parse(await res.json());
}

export type SubmitResult =
  | { kind: 'created'; status: 200 | 201; data: SiteRequestCreated }
  | { kind: 'validation'; fields: Record<string, string> }
  | { kind: 'rate_limited' }
  | { kind: 'unavailable'; status: number | null; reason: string };

export async function submitRequest(payload: SiteRequestPayload, clientIp: string | null): Promise<SubmitResult> {
  if (!env.CRM_API_URL || !env.SITE_API_KEY) {
    return { kind: 'unavailable', status: null, reason: 'not_configured' };
  }
  let res: Response;
  try {
    res = await fetch(`${env.CRM_API_URL}/site/requests`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json',
        ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}),
      }),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'network';
    return { kind: 'unavailable', status: null, reason };
  }

  const body: unknown = await res.json().catch(() => null);

  if (res.status === 200 || res.status === 201) {
    const parsed = z
      .object({ id: z.string(), request_number: z.number(), status: z.string() })
      .safeParse(body);
    if (parsed.success) return { kind: 'created', status: res.status, data: parsed.data };
    return { kind: 'unavailable', status: res.status, reason: 'bad_body' };
  }
  if (res.status === 422) {
    const fields = (body as ApiErrorBody | null)?.error?.fields ?? {};
    return { kind: 'validation', fields };
  }
  if (res.status === 429) return { kind: 'rate_limited' };
  // 401 means the key is wrong — an operator problem, never the visitor's. Logged by the caller.
  return { kind: 'unavailable', status: res.status, reason: res.status === 401 ? 'bad_key' : 'crm_error' };
}

/**
 * A branch photo's bytes, streamed from the CRM. Null when the CRM has no such photo (or
 * isn't configured); throws when it can't be reached.
 */
export async function fetchBranchPhoto(file: string): Promise<Response | null> {
  if (!env.CRM_API_URL || !env.SITE_API_KEY) return null;
  const res = await fetch(`${env.CRM_API_URL}/site/branch-photos/${file}`, {
    headers: headers({ Accept: 'image/*' }),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`crm: GET /site/branch-photos → ${res.status}`);
  return res;
}

/** `/api/health` probe: short timeout, never throws. */
export async function probeCrm(): Promise<'ok' | 'degraded' | 'not_configured'> {
  if (!env.CRM_API_URL || !env.SITE_API_KEY) return 'not_configured';
  try {
    const res = await fetch(`${env.CRM_API_URL}/site/config`, {
      headers: headers(),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
    return res.ok ? 'ok' : 'degraded';
  } catch {
    return 'degraded';
  }
}
