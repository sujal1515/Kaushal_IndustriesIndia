# Kaushal Industries — website

B2B catalogue and RFQ platform replacing www.kia-india.com, built to `../Kaushal_Industries_Implementation_Blueprint.md`.

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel · Resend · GTM/GA4.

```bash
npm install && npm run dev      # runs without any env vars, from the bundled catalogue
```

| Area | Where |
|---|---|
| Public pages | `src/app/(site)` |
| Admin (products, specs, images, resources, FAQs, enquiries, users, settings) | `src/app/admin` |
| RFQ pipeline (validate → spam checks → save → email → thank-you) | `src/app/actions/enquiry.ts`, `src/lib/enquiry` |
| Catalogue data layer (Supabase, or seed fallback) | `src/lib/data/catalogue.ts`, `src/lib/data/seed.ts` |
| Schema, RLS, storage, seed | `supabase/` |
| Legacy redirects (36 URLs) | `src/lib/legacy-redirects.ts`, `src/proxy.ts` |
| SEO: sitemap, robots, JSON-LD, OG image | `src/app/sitemap.ts`, `robots.ts`, `src/lib/seo.ts` |
| Security headers / CSP | `next.config.ts` |

Docs: [setup & go-live](docs/SETUP.md) · [client approvals](docs/CLIENT-APPROVALS.md)

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:seed-sql`, `test:redirects -- <base-url>`.
