import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Every date on the site is Tashkent time, whatever the visitor's device says (§9.4).
    timeZone: 'Asia/Tashkent',
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
