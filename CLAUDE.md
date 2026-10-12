# CLAUDE.md — iservice-web

The root [`../CLAUDE.md`](../CLAUDE.md) applies here too. Work from
[`../reference_files/web/DEVELOPMENT_PLAN.md`](../reference_files/web/DEVELOPMENT_PLAN.md) §14, one
box at a time. Where the plan and [`QUESTIONS.md`](../reference_files/web/QUESTIONS.md) disagree,
the answer wins.

## What differs from the CRM frontend

- **Server-rendered, static + ISR.** Pages are server components. The client islands are the
  menu, the language switch, the map link, the sticky CTA, the toast and the form. Keep it that
  way: every client component adds to the JS budget.
- **No TanStack Query.** The site has one mutation and no client-side reads.
- **The browser never calls the CRM.** `lib/crm.ts` is `server-only`, and the key lives only in
  server env.
- **Hosted on Vercel**, not Docker. `npm run build` / `npm start` is the "it runs" check.

## Rules that are easy to break

- **No hard-coded copy.** Every visible string goes in `src/messages/{ru,uz}.json`, and
  `npm run i18n:check` must pass. Uzbek uses `ʻ` (U+02BB) in oʻ/gʻ and `ʼ` (U+02BC) for the
  tutuq belgisi, never `'`.
- **Contact data comes from config.** Phones, addresses, hours, categories and brands come from
  `getSiteConfig()` (CRM, else `fallback-config.json`), never from markup.
- **No marketing claims.** No prices, warranty, "40 минут", "since 2016" or "15 минут". The
  client dropped them (Q4), and a test checks for them.
- **Map links** go through `<MapLink>` (`lib/maps.ts`): `geo:` on Android and Apple Maps on iOS,
  so the visitor's own map app opens, and Yandex web on desktop.
- **Time** is Asia/Tashkent (`features/request/slots.ts`), never the device zone.
- **Colours** come only from the tokens in `tailwind.config.ts`. Focus is always the black
  outline; red means error.
- **Performance:** run `npm run budget` and `npm run e2e` (which includes the jank test) before
  calling a change done. A new dependency needs a reason against the budget.

## Done means

`npm run verify` and `npm run e2e` are green, both locales and both widths have been checked, and
you've said in plain words how you verified it.
