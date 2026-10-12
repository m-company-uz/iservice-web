import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { submitRequest } from '@/lib/crm';
import { env } from '@/lib/env';
import { log } from '@/lib/log';
import { RateLimiter } from '@/lib/rate-limit';
import { fallbackConfig, getSiteConfig } from '@/lib/site-config';
import { maskPhone } from '@/features/request/phone';
import { requestBodySchema } from '@/features/request/schema';
import { isAcceptablePreferredAt } from '@/features/request/slots';
import type { SiteRequestPayload } from '@/types/site';

/**
 * The public edge of the request form (§4.3, §9.5). The browser posts here; this handler adds
 * the CRM key and forwards server-to-server. CRM error text is never passed through verbatim.
 */

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;
const MIN_FILL_MS = env.MIN_FILL_SECONDS * 1000;

const limiter = new RateLimiter({ per10Min: env.RATE_LIMIT_PER_10MIN, perDay: env.RATE_LIMIT_PER_DAY });

type ErrorCode = 'validation_failed' | 'rate_limited' | 'unavailable' | 'bad_request';

function error(status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

function clientIp(req: NextRequest): string | null {
  // Vercel (and Caddy) overwrite X-Forwarded-For; its first entry is the visitor.
  const xff = req.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const rid = randomUUID().slice(0, 8);

  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return error(415, 'bad_request', 'Expected application/json');
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return error(413, 'bad_request', 'Body too large');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return error(400, 'bad_request', 'Malformed JSON');
  }

  const parsed = requestBodySchema.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '_');
      fields[key] ??= issue.message === 'category_or_defect' || issue.message === 'phone_invalid' ? issue.message : 'invalid';
    }
    log('info', 'request_rejected', { rid, reason: 'validation', fields: Object.keys(fields) });
    return error(422, 'validation_failed', 'Validation failed', fields);
  }
  const body = parsed.data;

  // Bots: answer like a success and drop it, so they learn nothing (§9.6).
  if (body.website || started - body.started_at < MIN_FILL_MS) {
    log('info', 'request_dropped', { rid, reason: body.website ? 'honeypot' : 'too_fast' });
    return NextResponse.json({ request_number: null }, { status: 201 });
  }

  const ip = clientIp(req);
  if (!limiter.take(ip ?? 'unknown')) {
    log('info', 'request_rejected', { rid, reason: 'ip_rate_limited' });
    return error(429, 'rate_limited', 'Too many requests');
  }

  // Codes must exist in the current config; the CRM checks again (it is the authority).
  const config = await getSiteConfig();
  const fields: Record<string, string> = {};
  // A page built while the CRM was unreachable carries the fallback snapshot's branch ids.
  // Map those onto the live branch of the same name rather than refusing the client.
  let branchId = body.branch_id;
  if (branchId && !config.branches.some((b) => b.id === branchId)) {
    const name = fallbackConfig.branches.find((b) => b.id === branchId)?.name;
    branchId = config.branches.find((b) => b.name === name)?.id ?? branchId;
  }
  const category = body.category ? config.categories.find((c) => c.code === body.category) : undefined;
  if (body.category && (!category || !category.device_types.includes(body.device_type))) fields.category = 'invalid';
  if (body.device_brand && !config.brands.some((b) => b.code === body.device_brand)) fields.device_brand = 'invalid';
  if (branchId && !config.branches.some((b) => b.id === branchId)) fields.branch_id = 'invalid';
  if (body.preferred_at && !isAcceptablePreferredAt(body.preferred_at, new Date())) fields.preferred_at = 'invalid';
  if (Object.keys(fields).length) {
    log('info', 'request_rejected', { rid, reason: 'catalog', fields: Object.keys(fields) });
    return error(422, 'validation_failed', 'Validation failed', fields);
  }

  const payload: SiteRequestPayload = {
    idempotency_key: body.idempotency_key,
    locale: body.locale,
    client_name: body.client_name,
    phone: body.phone,
    channel: body.channel,
    device_type: body.device_type,
    device_brand: body.device_brand,
    device_model: body.device_model,
    category: body.category,
    defect: body.defect,
    branch_id: branchId,
    preferred_at: body.preferred_at,
    comment: body.comment,
    consent: true,
    meta: {
      client_ip: ip,
      user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      referrer: body.referrer,
      utm: body.utm,
    },
  };

  const result = await submitRequest(payload, ip);
  const base = { rid, phone: maskPhone(body.phone), ms: Date.now() - started };

  switch (result.kind) {
    case 'created':
      log('info', 'request_sent', { ...base, crm_status: result.status, number: result.data.request_number });
      return NextResponse.json({ request_number: result.data.request_number }, { status: result.status });
    case 'validation': {
      log('info', 'request_rejected', { ...base, reason: 'crm_validation', fields: Object.keys(result.fields) });
      const mapped = Object.fromEntries(Object.keys(result.fields).map((k) => [k, 'invalid']));
      return error(422, 'validation_failed', 'Validation failed', mapped);
    }
    case 'rate_limited':
      log('info', 'request_rejected', { ...base, reason: 'crm_rate_limited' });
      return error(429, 'rate_limited', 'Too many requests');
    case 'unavailable':
      // bad_key / not_configured are operator problems: logged loudly, shown to the visitor as a retry.
      log(result.reason === 'bad_key' || result.reason === 'not_configured' ? 'error' : 'warn', 'request_failed', {
        ...base,
        crm_status: result.status,
        reason: result.reason,
      });
      return error(502, 'unavailable', 'CRM unavailable');
  }
}
