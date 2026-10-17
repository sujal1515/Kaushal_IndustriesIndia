# Setup, deployment & go-live

Stack: Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Vercel · Resend · GA4/GTM.
All accounts should be **client-owned** (blueprint §8.6). Use paid plans for production: Vercel Hobby is non-commercial, and Supabase free projects pause when idle.

## 1. Local development

```bash
npm install
cp .env.example .env.local   # leave Supabase blank to run from the bundled catalogue
npm run dev                  # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## 2. Supabase

1. Create a project (region close to India, e.g. Mumbai `ap-south-1`).
2. Create the database. Quickest: put the **Session pooler** connection string (Supabase → Connect, with
   your database password; write `@` in the password as `%40`) in `.env.local` as `SUPABASE_DB_URL`, then run
   `npm run db:setup`. It applies any pending migrations (tracked in `public.schema_migrations`) and both
   seeds; run it again after pulling new migrations. `npm run db:setup -- --status` only reports, and
   `npm run db:setup -- --admin you@example.com` makes an existing login an administrator.

   Alternatively paste `supabase/setup-all.sql` (every migration and seed in one file) into the SQL editor
   of a new project, or run the migrations in order with the Supabase CLI (`supabase db push`):
   - `supabase/migrations/20261004000100_schema.sql`
   - `supabase/migrations/20261004000200_rls.sql`
   - `supabase/migrations/20261004000300_storage.sql`
   - `supabase/migrations/20261017000100_cms_media_crm.sql` — page content (CMS), media library, lead management
   - `supabase/migrations/20261017000200_audit_skip_bookkeeping.sql` — keeps timestamp-only updates out of the activity log
3. Load the data (done by `db:setup` and `setup-all.sql`), in this order:
   - `supabase/seed.sql` — the catalogue. Regenerate after editing `src/lib/data/seed.ts` with `npm run db:seed-sql`.
   - `supabase/seed-cms.sql` — every page's current content, published. Regenerate after changing `src/lib/cms/pages.ts` with `npm run db:seed-cms`.

   Both seeds are idempotent and never overwrite rows that already exist. `npm run test:db` runs every migration and seed on a local Postgres (PGlite) and checks the access rules.
4. **Auth settings**:
   - Turn **off** "Allow new users to sign up". Access is invite-only.
   - Site URL: `https://www.kia-india.com`. Redirect URLs: add `https://www.kia-india.com/auth/confirm` and your preview domain.
   - Email templates → **Invite user** and **Reset password**: set the link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/set-password`
     (use `type=recovery` for the reset template).
   - Use custom SMTP (Resend) for auth emails so they don't hit Supabase's default rate limit.
5. **First admin**: in Authentication → Users, invite yourself. Then run:
   ```sql
   update public.profiles set role = 'admin', is_active = true where email = 'you@example.com';
   ```
   Invite everyone else from **Admin → Users**.
6. Copy the URL, anon key and service-role key into the environment variables.

## 3. Email (Resend)

1. Add the domain `notify.kia-india.com` in Resend and create the DNS records it shows (SPF/DKIM on the subdomain).
   This leaves the Microsoft 365 SPF on the root domain untouched (blueprint §8.5).
2. Add DMARC on the root domain, starting in monitoring mode: `_dmarc.kia-india.com TXT "v=DMARC1; p=none; rua=mailto:…"`.
3. Set `RESEND_API_KEY` and `EMAIL_FROM`, then set recipients in **Admin → Settings**.
4. Test: submit an RFQ and confirm both the sales notification and the buyer acknowledgement arrive in Gmail **and** Outlook, not in junk.

## 4. Vercel

1. Import the repository and set every variable from `.env.example` for **Production** and **Preview** (point Preview at a staging Supabase project).
2. Preview deployments are automatically `noindex` (header + robots).
3. Domains: add `www.kia-india.com` as primary and `kia-india.com` redirecting to it.

## 5. Analytics

Create GA4 and GTM under client-owned Google accounts and set `NEXT_PUBLIC_GTM_ID`. In GTM, map these dataLayer events to GA4 events:
`quote_start`, `generate_lead` (mark as a key event), `contact_submit`, `contact_click`, `file_download`, `view_item`, `select_item`, `search`.
Consent Mode v2 defaults to denied. The banner appears only when GTM is configured.

## 6. Go-live checklist

- [ ] Client approvals complete (`docs/CLIENT-APPROVALS.md`)
- [ ] `npm run build` passes; the admin dashboard's **System status** shows everything green
- [ ] RFQ, distributor and contact forms tested end to end (DB row, both emails, thank-you page, GA4 event)
- [ ] `npm run test:redirects -- https://<preview-url>` passes 35/35
- [ ] DNS cut-over to Vercel; re-run `npm run test:redirects -- https://www.kia-india.com`
- [ ] Search Console: verify the domain property and submit `/sitemap.xml`
- [ ] PageSpeed Insights on Home, a category page and a product page (target LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms)
- [ ] Admin MFA enabled for every administrator
- [ ] Monitor Search Console coverage, 404s and form deliveries for 30 days (warranty period)
