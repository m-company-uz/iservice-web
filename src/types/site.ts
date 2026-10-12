/**
 * Mirrors the CRM's site DTOs (DEVELOPMENT_PLAN §10; `crm-backend/internal/dto/site.go` once C2
 * is built). snake_case on the wire, like the rest of the CRM API. Kept in sync by hand.
 */

export const LOCALES = ['ru', 'uz'] as const;
export type Locale = (typeof LOCALES)[number];

/** Added after the plan: the client also repairs laptops and desktop PCs. */
export const DEVICE_TYPES = ['phone', 'tablet', 'laptop', 'pc'] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

/** WhatsApp was dropped by the client (QUESTIONS Q6). */
export const CONTACT_CHANNELS = ['call', 'telegram'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export interface SiteBranch {
  id: string;
  /** Short Latin name, the same in both languages — "Aviasozlar 2-65". */
  name: string;
  label_ru: string;
  label_uz: string;
  address_ru: string;
  address_uz: string;
  /** E.164, `+998XXXXXXXXX`, or null when the CRM has no phone for the branch. */
  phone: string | null;
  /** `HH:mm`, Asia/Tashkent. */
  opens_at: string;
  closes_at: string;
  /** ISO weekdays, Mon = 1 … Sun = 7. */
  work_days: number[];
  latitude: number | null;
  longitude: number | null;
  /** Free-text search used by map apps when there are no coordinates. */
  map_query: string;
}

export interface SiteCategory {
  code: string;
  label_ru: string;
  label_uz: string;
  /** Device types this category is offered for on the form. */
  device_types: DeviceType[];
}

export interface SiteBrand {
  code: string;
  /** Brand names are not translated; only "other" has per-locale labels. */
  label?: string;
  label_ru?: string;
  label_uz?: string;
}

export interface SiteConfig {
  branches: SiteBranch[];
  categories: SiteCategory[];
  brands: SiteBrand[];
  /** `HH:mm` slot starts, Asia/Tashkent. */
  slots: string[];
  booking_days: number;
  contacts: { telegram: string };
}

/** Body of `POST /api/v1/site/requests` (§10.1). */
export interface SiteRequestPayload {
  idempotency_key: string;
  locale: Locale;
  client_name: string | null;
  phone: string;
  channel: ContactChannel;
  device_type: DeviceType;
  device_brand: string | null;
  device_model: string | null;
  category: string | null;
  defect: string | null;
  branch_id: string | null;
  /** ISO 8601 with `+05:00`. */
  preferred_at: string | null;
  comment: string | null;
  consent: true;
  meta: {
    client_ip: string | null;
    user_agent: string | null;
    referrer: string | null;
    utm: { source: string | null; medium: string | null; campaign: string | null };
  };
}

export interface SiteRequestCreated {
  id: string;
  request_number: number;
  status: string;
}

/** The CRM's standard error shape (root CLAUDE.md). `rate_limited` is new with C2. */
export interface ApiErrorBody {
  error: {
    code: 'validation_failed' | 'rate_limited' | 'unauthorized' | string;
    message: string;
    fields?: Record<string, string>;
  };
}
