import { getTranslations } from 'next-intl/server';

const STEPS = ['1', '2', '3', '4'] as const;

/** Grey band, faded big numerals and a red top rule on desktop; numbered list on phones. */
export async function HowItWorks() {
  const t = await getTranslations('home.how');
  return (
    <section id="how" aria-labelledby="how-title" className="bg-surface py-14 md:py-20 lg:py-24">
      <div className="page-x">
        <h2 id="how-title" className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[42px]">
          {t('title')}
        </h2>
        <ol className="mt-8 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {STEPS.map((n) => (
            <li key={n} className="flex gap-4 md:block md:border-t-2 md:border-brand md:pt-5">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-control bg-ink font-display text-[16px] font-bold text-white md:size-auto md:justify-start md:bg-transparent md:text-[56px] md:font-extrabold md:leading-none md:text-brand/15"
              >
                {n}
              </span>
              <div className="md:mt-4">
                <h3 className="font-display text-[17px] font-bold text-ink md:text-[19px]">{t(`steps.${n}.title`)}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-body-soft">{t(`steps.${n}.desc`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
