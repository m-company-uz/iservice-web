import { describe, expect, it } from 'vitest';
import { emptyValues, requestBodySchema, stepSchemas } from './schema';

const body = {
  idempotency_key: '6f1c2a0e-6c7b-4d0e-9f7a-2d3b9a1c0e55',
  locale: 'ru',
  client_name: 'Aziz',
  phone: '+998901234567',
  channel: 'call',
  device_type: 'phone',
  device_brand: 'apple',
  device_model: 'iPhone 13 Pro',
  category: 'screen',
  defect: '',
  branch_id: null,
  preferred_at: '2026-10-12T10:00:00+05:00',
  comment: '',
  consent: true,
  started_at: 1,
  referrer: null,
  utm: { source: null, medium: null, campaign: null },
};

describe('step schemas', () => {
  it('step 1 needs a category or a description', () => {
    const r = stepSchemas[0].safeParse(emptyValues);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ['category'], message: 'category_or_defect' });
    expect(stepSchemas[0].safeParse({ ...emptyValues, defect: 'не включается' }).success).toBe(true);
    expect(stepSchemas[0].safeParse({ ...emptyValues, category: 'screen' }).success).toBe(true);
  });

  it('step 2 tells an empty phone from an incomplete one', () => {
    const msg = (phone: string) => stepSchemas[1].safeParse({ ...emptyValues, phone }).error?.issues[0]?.message;
    expect(msg('')).toBe('phone_required');
    expect(msg('+998 ')).toBe('phone_required');
    expect(msg('+998 90 12')).toBe('phone_invalid');
    expect(stepSchemas[1].safeParse({ ...emptyValues, phone: '+998 90 123-45-67' }).success).toBe(true);
  });

  it('step 3 needs consent, and a time once a date is picked', () => {
    const issues = stepSchemas[2].safeParse({ ...emptyValues, date: '2026-10-12' }).error?.issues.map((i) => i.message);
    expect(issues).toContain('consent_required');
    const r = stepSchemas[2].safeParse({ ...emptyValues, consent: true, date: '2026-10-12' });
    expect(r.error?.issues[0]).toMatchObject({ path: ['time'], message: 'time_required' });
    expect(stepSchemas[2].safeParse({ ...emptyValues, consent: true }).success).toBe(true);
  });
});

describe('request body', () => {
  it('accepts a full body and turns empty strings into null', () => {
    const r = requestBodySchema.parse(body);
    expect(r.defect).toBeNull();
    expect(r.comment).toBeNull();
  });
  it('rejects a body with neither category nor defect', () => {
    expect(requestBodySchema.safeParse({ ...body, category: '' }).success).toBe(false);
  });
  it('rejects non-E.164 phones, missing consent and WhatsApp', () => {
    expect(requestBodySchema.safeParse({ ...body, phone: '901234567' }).success).toBe(false);
    expect(requestBodySchema.safeParse({ ...body, consent: false }).success).toBe(false);
    expect(requestBodySchema.safeParse({ ...body, channel: 'whatsapp' }).success).toBe(false);
  });
  it('rejects a preferred time not in +05:00', () => {
    expect(requestBodySchema.safeParse({ ...body, preferred_at: '2026-10-12T10:00:00Z' }).success).toBe(false);
  });
});
