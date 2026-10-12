import type { Locale, SiteBrand, SiteCategory } from '@/types/site';

export const labelOf = (item: { label_ru?: string; label_uz?: string; label?: string }, locale: Locale): string =>
  item.label ?? (locale === 'ru' ? item.label_ru : item.label_uz) ?? '';

export const findCategory = (cats: SiteCategory[], code: string) => cats.find((c) => c.code === code);
export const findBrand = (brands: SiteBrand[], code: string) => brands.find((b) => b.code === code);

/** Brands are phone/tablet makers; laptops and PCs only get a free-text model. */
export const hasBrands = (deviceType: string) => deviceType === 'phone' || deviceType === 'tablet';
