import { describe, expect, it } from 'vitest';
import { appleMapsUrl, detectPlatform, geoUri, mapHref, webMapUrl } from './maps';

const withCoords = { lat: 41.284524, lon: 69.348154, query: 'iService, Ташкент', label: 'i-Service Aviasozlar 2-65' };
const noCoords = { lat: null, lon: null, query: 'iService, Бешарыкская улица, 1, Ташкент', label: 'i-Service' };

describe('map links', () => {
  it('Android gets a geo: URI, handled by the default map app', () => {
    expect(geoUri(withCoords)).toBe('geo:41.284524,69.348154?q=41.284524,69.348154(i-Service%20Aviasozlar%202-65)');
    expect(geoUri(noCoords)).toBe(`geo:0,0?q=${encodeURIComponent(noCoords.query)}`);
  });
  it('iOS gets an Apple Maps link', () => {
    expect(appleMapsUrl(withCoords)).toBe('https://maps.apple.com/?ll=41.284524,69.348154&q=i-Service%20Aviasozlar%202-65');
    expect(appleMapsUrl(noCoords)).toContain('https://maps.apple.com/?q=');
  });
  it('everything else gets Yandex Maps on the web (lon,lat order)', () => {
    expect(webMapUrl(withCoords)).toBe('https://yandex.uz/maps/?pt=69.348154,41.284524&z=17&l=map');
    expect(webMapUrl(noCoords)).toContain('https://yandex.uz/maps/?text=');
  });
  it('detects platforms, including iPadOS posing as a Mac', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 11; Redmi 9A)')).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('other');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('other');
  });
  it('mapHref picks per platform', () => {
    expect(mapHref(withCoords, 'android')).toMatch(/^geo:/);
    expect(mapHref(withCoords, 'ios')).toMatch(/^https:\/\/maps\.apple\.com/);
    expect(mapHref(withCoords, 'other')).toMatch(/^https:\/\/yandex\.uz/);
  });
});
