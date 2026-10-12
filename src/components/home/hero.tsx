import { getImageProps } from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buttonClass } from '@/components/ui/button';
import { Phone } from '@/components/ui/icons';
import { firstPhone, formatPhoneDisplay } from '@/lib/hours';
import type { SiteConfig } from '@/types/site';

/**
 * Hero (§7.2). Art-directed photo: a tall crop for phones and a wide one for desktop, through
 * <picture>, so a phone never downloads the desktop image (DEV 1, §11.2).
 */
export async function Hero({ config }: { config: SiteConfig }) {
  const t = await getTranslations('home.hero');
  const tc = await getTranslations('common');
  const alt = t('imageAlt');
  const callPhone = firstPhone(config);

  const desktop = getImageProps({
    alt,
    src: '/images/hero-desktop.jpg',
    width: 1920,
    height: 1200,
    quality: 60,
    sizes: '(min-width: 1200px) 640px, 45vw',
  }).props;
  const phone = getImageProps({
    alt,
    src: '/images/hero-phone.jpg',
    width: 1080,
    height: 1350,
    quality: 60,
    sizes: '(min-width: 600px) calc(100vw - 48px), calc(100vw - 32px)',
  }).props;

  // The photo is the LCP element: preload only the crop this viewport will show. Rendered as
  // <link> (React hoists it to <head>) because ReactDOM.preload() drops `media`.
  const preloads = [
    { media: '(max-width: 833px)', p: phone },
    { media: '(min-width: 834px)', p: desktop },
  ];

  return (
    <section className="on-dark bg-night pb-6 text-white md:pb-16 lg:pb-20" aria-labelledby="hero-title">
      {preloads.map(({ media, p }) => (
        <link
          key={media}
          rel="preload"
          as="image"
          media={media}
          imageSrcSet={p.srcSet}
          imageSizes={p.sizes}
          fetchPriority="high"
        />
      ))}
      <div className="page-x grid items-center gap-6 pt-4 md:grid-cols-[1.1fr_1fr] md:gap-10 md:pt-12 lg:gap-14 lg:pt-16">
        <div>
          <p className="eyebrow text-brand-soft">{t('eyebrow', { count: config.branches.length })}</p>
          <h1
            id="hero-title"
            className="mt-3 max-w-[11ch] font-display text-[40px] font-extrabold leading-[1] tracking-[-0.03em] sm:text-[52px] md:mt-5 lg:text-[66px]"
          >
            {t('title')}
          </h1>
          <p className="mt-4 max-w-[530px] text-[15.5px] leading-relaxed text-white/60 md:mt-6 md:text-[17.5px]">
            {t('sub')}
          </p>
          <div className="mt-8 hidden md:block">
            <Link href="/order" className={buttonClass('primary', 'lg')}>
              {tc('cta')}
            </Link>
          </div>
          <div className="mt-10 hidden h-px bg-white/15 md:block" />
        </div>

        <picture className="relative block aspect-[4/5] overflow-hidden rounded-hero bg-night-2 md:aspect-[4/3]">
          <source media="(min-width: 834px)" srcSet={desktop.srcSet} sizes={desktop.sizes} />
          <source srcSet={phone.srcSet} sizes={phone.sizes} />
          {/* Art direction needs <picture>; the props come from getImageProps, so this is still next/image. */}
          <img
            {...phone}
            alt={alt}
            fetchPriority="high"
            loading="eager"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>

        {/* Phone: CTA plus a call button under the photo (design §02). */}
        <div className="flex flex-col gap-3 md:hidden">
          <Link id="hero-cta" href="/order" className={buttonClass('primary', 'lg', 'w-full')}>
            {tc('cta')}
          </Link>
          {callPhone && (
            <a href={`tel:${callPhone}`} className={buttonClass('dark', 'lg', 'w-full tabular-nums')}>
              <Phone width={18} height={18} />
              {formatPhoneDisplay(callPhone)}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
