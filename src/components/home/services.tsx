import { getTranslations } from 'next-intl/server';

const PHONES = ['screen', 'battery', 'motherboard', 'water', 'software', 'data', 'housing', 'drop'] as const;
const COMPUTERS = ['cleaning', 'windows', 'drivers', 'programs'] as const;

/**
 * "Что ремонтируем". The design drew 4 phone cards; the client's service list (11 Oct 2026)
 * has 8 phone services plus laptops/PCs, so the same card is used in two groups.
 * No prices or warranty lines: unconfirmed claims are dropped (Q4).
 */
export async function Services() {
  const t = await getTranslations('home.services');

  const group = (title: string, keys: readonly string[], offset = 0) => (
    <div className="mt-10 first-of-type:mt-8 md:mt-14">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">{title}</h3>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {keys.map((k, i) => (
          <li key={k} className="rounded-card border border-line bg-white p-5 lg:min-h-[200px] lg:p-6">
            <span className="hidden font-mono text-[12px] font-bold text-brand md:block">
              {String(offset + i + 1).padStart(2, '0')}
            </span>
            <h4 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink md:mt-3 lg:text-[19px]">
              {t(`items.${k}.title`)}
            </h4>
            <p className="mt-2 text-[14px] leading-relaxed text-body-soft">{t(`items.${k}.desc`)}</p>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section id="services" aria-labelledby="services-title" className="page-x py-14 md:py-20 lg:py-24">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
        <h2 id="services-title" className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[42px]">
          {t('title')}
        </h2>
        <p className="max-w-[380px] text-[14px] leading-relaxed text-muted md:text-right">{t('note')}</p>
      </div>
      {group(t('phones'), PHONES)}
      {group(t('computers'), COMPUTERS, PHONES.length)}
    </section>
  );
}
