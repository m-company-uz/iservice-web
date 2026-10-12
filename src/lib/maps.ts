/**
 * Map links that open the visitor's own map app (DEV note 2, client request 11 Oct 2026).
 *
 * There is no single URL that means "the default map app" on every platform, so the link is
 * chosen per platform after hydration:
 *  - Android: a `geo:` URI. Android hands it to the default map app (Yandex Maps, Google Maps,
 *    2GIS…) or shows a chooser when no default is set.
 *  - iOS / iPadOS: Apple's `maps.apple.com` link, which iOS routes to the system map handler.
 *    iOS has no `geo:` scheme, and no web page can see which map apps are installed.
 *  - Everything else (desktop): Yandex Maps on the web, the map most people use in Tashkent.
 * The server-rendered `href` is the web link, so the link works before and without JavaScript.
 */

export interface MapTarget {
  lat: number | null;
  lon: number | null;
  /** Free-text search, used when there are no coordinates. */
  query: string;
  /** Pin label shown by apps that support one. */
  label: string;
}

export type Platform = 'android' | 'ios' | 'other';

const hasCoords = (t: MapTarget): t is MapTarget & { lat: number; lon: number } =>
  t.lat !== null && t.lon !== null;

export function webMapUrl(t: MapTarget): string {
  if (hasCoords(t)) return `https://yandex.uz/maps/?pt=${t.lon},${t.lat}&z=17&l=map`;
  return `https://yandex.uz/maps/?text=${encodeURIComponent(t.query)}`;
}

export function geoUri(t: MapTarget): string {
  if (hasCoords(t)) return `geo:${t.lat},${t.lon}?q=${t.lat},${t.lon}(${encodeURIComponent(t.label)})`;
  return `geo:0,0?q=${encodeURIComponent(t.query)}`;
}

export function appleMapsUrl(t: MapTarget): string {
  if (hasCoords(t)) return `https://maps.apple.com/?ll=${t.lat},${t.lon}&q=${encodeURIComponent(t.label)}`;
  return `https://maps.apple.com/?q=${encodeURIComponent(t.query)}`;
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'other';
}

export function mapHref(t: MapTarget, platform: Platform): string {
  if (platform === 'android') return geoUri(t);
  if (platform === 'ios') return appleMapsUrl(t);
  return webMapUrl(t);
}
