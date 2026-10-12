import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

const WORKS = [
  { key: 'motherboard', src: '/images/work-motherboard.jpg' },
  { key: 'notebook', src: '/images/work-notebook.jpg' },
  { key: 'build', src: '/images/work-build.jpg' },
] as const;

/** Real workshop photos, one per set the client sent. A swipe row on phones, a grid on desktop. */
export async function Works() {
  const t = await getTranslations('home.works');
  return (
    <section aria-labelledby="works-title" className="bg-night py-14 text-white md:py-20 lg:py-24">
      <div className="page-x flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
        <h2 id="works-title" className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[42px]">
          {t('title')}
        </h2>
        <p className="max-w-[380px] text-[14px] leading-relaxed text-white/55 md:text-right">{t('note')}</p>
      </div>
      {/* A swipe row on phones: focusable so keyboard users can scroll it too (axe). */}
      <div
        role="region"
        aria-labelledby="works-title"
        tabIndex={0}
        className="no-scrollbar mt-8 snap-x snap-mandatory scroll-px-4 overflow-x-auto sm:scroll-px-6 md:mt-12 md:overflow-visible"
      >
      <ul className="page-x flex gap-3 md:grid md:grid-cols-3 md:gap-4">
        {WORKS.map((w) => (
          <li key={w.key} className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-auto">
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-night-2">
                <Image
                  src={w.src}
                  alt={t(`${w.key}Alt`)}
                  fill
                  quality={60}
                  sizes="(min-width: 1200px) 430px, (min-width: 834px) 31vw, 78vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-[15px] font-semibold leading-snug text-white/90">{t(w.key)}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
