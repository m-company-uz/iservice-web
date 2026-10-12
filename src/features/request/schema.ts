import { z } from 'zod';
import { CONTACT_CHANNELS, DEVICE_TYPES, LOCALES } from '@/types/site';
import { isCompletePhone } from './phone';

/**
 * One schema per step (§9.2), plus the JSON body the browser posts to `/api/requests`, which
 * the route handler re-validates with the same rules. Error messages are message-key suffixes
 * under `request.errors.*`, so the copy stays in ru.json / uz.json.
 */

export const LIMITS = { model: 100, defect: 1000, name: 100, comment: 500 } as const;

/** Every message a schema can produce; anything else (zod's own text) is shown as `invalid`. */
export const ERROR_KEYS = new Set([
  'category_or_defect',
  'too_long',
  'phone_required',
  'phone_invalid',
  'time_required',
  'consent_required',
  'invalid',
]);

export interface RequestFormValues {
  device_type: (typeof DEVICE_TYPES)[number];
  category: string;
  device_brand: string;
  device_model: string;
  defect: string;
  client_name: string;
  /** As displayed: `+998 90 123-45-67`. Normalised on submit. */
  phone: string;
  channel: (typeof CONTACT_CHANNELS)[number];
  branch_id: string;
  date: string;
  time: string;
  comment: string;
  consent: boolean;
  /** Honeypot (§9.6). Humans never see it. */
  website: string;
}

export const emptyValues: RequestFormValues = {
  device_type: 'phone',
  category: '',
  device_brand: '',
  device_model: '',
  defect: '',
  client_name: '',
  phone: '',
  channel: 'call',
  branch_id: '',
  date: '',
  time: '',
  comment: '',
  consent: false,
  website: '',
};

const step1 = z
  .object({
    device_type: z.enum(DEVICE_TYPES),
    category: z.string(),
    device_brand: z.string(),
    device_model: z.string().max(LIMITS.model, 'too_long'),
    defect: z.string().max(LIMITS.defect, 'too_long'),
  })
  // "Обязательны только неисправность и телефон": a chip OR a description.
  .refine((v) => v.category !== '' || v.defect.trim() !== '', { path: ['category'], message: 'category_or_defect' });

const step2 = z.object({
  client_name: z.string().max(LIMITS.name, 'too_long'),
  phone: z
    .string()
    .refine((v) => v.replace(/\D/g, '') !== '' && v.trim() !== '+998', 'phone_required')
    .refine(isCompletePhone, 'phone_invalid'),
  channel: z.enum(CONTACT_CHANNELS),
});

const step3 = z
  .object({
    branch_id: z.string(),
    date: z.string(),
    time: z.string(),
    comment: z.string().max(LIMITS.comment, 'too_long'),
    consent: z.boolean().refine((v) => v, 'consent_required'),
  })
  .refine((v) => v.date === '' || v.time !== '', { path: ['time'], message: 'time_required' });

export const stepSchemas = [step1, step2, step3] as const;
export type StepIndex = 0 | 1 | 2;

/** Which step owns a field — used to jump back when an error lands on an earlier step. */
export const fieldStep: Record<string, StepIndex> = {
  device_type: 0,
  category: 0,
  device_brand: 0,
  device_model: 0,
  defect: 0,
  client_name: 1,
  phone: 1,
  channel: 1,
  branch_id: 2,
  date: 2,
  time: 2,
  comment: 2,
  consent: 2,
};

export const stepFields: Array<Array<keyof RequestFormValues>> = [
  ['device_type', 'category', 'device_brand', 'device_model', 'defect'],
  ['client_name', 'phone', 'channel'],
  ['branch_id', 'date', 'time', 'comment', 'consent'],
];

/** CRM 422 field names (wire) → form fields. */
export const wireToFormField: Record<string, keyof RequestFormValues> = {
  device_type: 'device_type',
  category: 'category',
  device_brand: 'device_brand',
  device_model: 'device_model',
  defect: 'defect',
  client_name: 'client_name',
  phone: 'phone',
  channel: 'channel',
  branch_id: 'branch_id',
  preferred_at: 'time',
  comment: 'comment',
  consent: 'consent',
};

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === '' ? null : v));

/** What the browser posts to `/api/requests` (same origin). */
export const requestBodySchema = z
  .object({
    idempotency_key: z.string().uuid(),
    locale: z.enum(LOCALES),
    client_name: nullableText(LIMITS.name),
    phone: z.string().regex(/^\+998\d{9}$/, 'phone_invalid'),
    channel: z.enum(CONTACT_CHANNELS),
    device_type: z.enum(DEVICE_TYPES),
    device_brand: nullableText(40),
    device_model: nullableText(LIMITS.model),
    category: nullableText(40),
    defect: nullableText(LIMITS.defect),
    branch_id: nullableText(64),
    preferred_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+05:00$/)
      .nullable(),
    comment: nullableText(LIMITS.comment),
    consent: z.literal(true),
    /** ms epoch when the form was opened — the minimum-fill-time check (§9.6). */
    started_at: z.number().int().nonnegative(),
    website: z.string().max(500).optional(),
    referrer: z.string().max(500).nullable(),
    utm: z.object({
      source: z.string().max(100).nullable(),
      medium: z.string().max(100).nullable(),
      campaign: z.string().max(100).nullable(),
    }),
  })
  .refine((v) => v.category !== null || v.defect !== null, { path: ['category'], message: 'category_or_defect' });

export type RequestBody = z.input<typeof requestBodySchema>;
