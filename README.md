# iservice-web — public website for i-Service

The public site for i-Service, a two-branch phone and laptop repair service in Yashnobod,
Tashkent: a home page and a 3-step repair-request form that sends requests to the CRM. Russian
and Uzbek (Latin), phone-first.

- **Plan:** [`../reference_files/web/DEVELOPMENT_PLAN.md`](../reference_files/web/DEVELOPMENT_PLAN.md)
  (answered questions: [`QUESTIONS.md`](../reference_files/web/QUESTIONS.md)).
- **Design:** `../reference_files/web/i-Service Site.dc.html`.
- **Working agreement:** [`CLAUDE.md`](./CLAUDE.md), which points to the root one.

| Route | What |
|---|---|
| `/ru`, `/uz` | Home: hero, hours strip, services (phones + laptops/PCs), workshop photos, how it works, branches, footer |
| `/ru/order`, `/uz/order` | Request form: device → contacts → branch and time |
| `/` | Redirects to the remembered language (`NEXT_LOCALE` cookie), else the browser's, else `ru` |
| `POST /api/requests` | The form's endpoint. Validates, filters bots, rate-limits, then forwards to the CRM with the server-only key |
| `GET /api/health` | `200 {status:"ok", crm:"ok"\|"degraded"\|"not_configured"}` |

## Run it

```bash
nvm use 22
npm install
cp .env.example .env.local          # defaults point at the mock CRM
npm run mock-crm                    # fake CRM on :8099, for offline dev and the mocked e2e
npm run dev                         # http://localhost:3001/ru
```

Against the real CRM: run `crm-backend` (`make seed-demo && make run`; its `.env` already
has the dev `SITE_API_KEY`), set `CRM_API_URL=http://localhost:8080/api/v1` here with the same
key, and requests appear in the CRM's **Заявки** screen. If the CRM is unreachable the site
still renders, from `src/content/fallback-config.json`, and submitting shows the "couldn't
send, call us" state.

The mock CRM has scenario phone numbers. A number ending in `0422` gets a 422 on the phone
field, `0429` gets a 429, `0500` gets a 500, and `0408` gets a 3-second delay.

## Check it

```bash
npm run verify     # typecheck + i18n parity + lint + unit tests + build + JS budget
npm run e2e        # Playwright: 390 & 1440 px, RU & UZ, axe, mock CRM; then the jank test, serially
npm run lhci       # Lighthouse CI (needs the build and `MOCK_CRM_PORT=8199 npm run mock-crm`)
npm run e2e:live   # against the real crm-backend on :8080 — builds with it, posts real requests
```

`npm run e2e` runs against the production build, so run `npm run build` first. CI
(`.github/workflows/ci.yml`) runs all three on every PR.

| Gate | Where | Limit |
|---|---|---|
| JS per page, gzip, everything loaded on first visit | `scripts/check-bundle.mjs` | home ≤ 145 KB, form ≤ 175 KB |
| Long tasks at 4× CPU throttle (scroll, menu, typing, steps) | `e2e/perf.spec.ts` | fail > 100 ms, warn > 50 ms |
| Lighthouse mobile, median of 3 | `lighthouserc.json` | perf ≥ 90, a11y/BP/SEO = 100, CLS ≤ 0.02, TBT ≤ 200 ms, LCP ≤ 3.5 s, ≤ 480 KB |

The plan's targets are stricter: perf ≥ 95, LCP ≤ 2.0 s, home JS ≤ 90 KB. Why the gates differ
from them is recorded in the plan's §14 notes.

## Deploy (Vercel)

The CRM's frontend already runs on Vercel, and the client chose the same for the site (Q1, Q32).

1. Import `m-company-uz/iservice-web` into Vercel. The framework is detected; the region is
   Vercel's default.
2. Set these environment variables for Production and Preview:
   - `NEXT_PUBLIC_SITE_URL=https://iservicepro.uz`
   - `CRM_API_URL=https://<crm api host>/api/v1`
   - `SITE_API_KEY=<openssl rand -hex 32>`, with the same value in the CRM's env
     (`/etc/iservice/backend.env` on the VPS, see `deploy/VPS.md`).
3. Add the domains `iservicepro.uz` and `www.iservicepro.uz` (redirect www → apex) and set the DNS
   records Vercel shows.
4. Every push to `main` deploys. To roll back, promote an earlier deployment in the Vercel
   dashboard. The site is stateless, so rollback is instant.

**Where the code runs:**
- Pages are static with ISR every 5 minutes, served from Vercel's edge.
- Only `/api/requests` and `/api/health` run as functions. The CRM key stays in them.
- The in-memory IP rate limiter is per function instance, so on Vercel it is best effort. The
  CRM's per-phone cap is the authoritative limit.

## Photos

The client's originals live in `../reference_files/web/img` (iPhone shots, up to 6048×8064, with
GPS in the EXIF). `npm run images` crops them into `public/images/`. It applies orientation,
**strips all EXIF including GPS**, and writes JPEG masters about 2× the largest display size. It
also builds the OG image and `apple-icon.png`. `next/image` serves AVIF/WebP from the masters.
The outputs are committed and the originals are not.

| File | Source | Used for |
|---|---|---|
| `hero-desktop.jpg` 1920×1200, `hero-phone.jpg` 1080×1350 | `work/work5` | Hero, art-directed through `<picture>` |
| `branch-aviasozlar-2-65.jpg` | `loc/loc3` | Branch 1 card (GPS in loc1–3 matches its coordinates) |
| `branch-aviasozlar-bozori.jpg` | `loc/loc4` | Branch 2 card |
| `work-*.jpg` | one per service folder | "Наша мастерская" strip |

## Layout

```
src/app/[locale]/        layout (html/lang/fonts), page (home), order/, not-found, error, [...rest]
src/app/api/             requests (public edge → CRM), health
src/components/          layout/ (header, menu, footer, lang switch), home/ (sections), ui/ (icons, button, map link)
src/features/request/    the form: schema, steps, phone mask, Tashkent slots, draft, summary, rail
src/lib/                 crm (server-only client), site-config (ISR + fallback), maps, hours, seo, rate-limit, env
src/content/             fallback-config.json: the branches/categories/brands snapshot
src/messages/            ru.json, uz.json (i18n:check keeps them in sync)
src/types/site.ts        mirrors the CRM's /site DTOs (snake_case on the wire)
mock-crm/                stand-in for the CRM's /api/v1/site/* (offline dev, mocked e2e)
```
