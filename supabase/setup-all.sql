-- Kaushal Industries — complete database setup (all migrations + catalogue + page content).
-- Run once in Supabase → SQL Editor on a new project. Generated from the files in this folder.

-- ==================== migrations/20261004000100_schema.sql ====================
-- Kaushal Industries — core schema (blueprint §7.2)
-- Additions to the blueprint draft, documented in docs/IMPLEMENTATION-NOTES.md:
--   products.facets / highlights / notes, enquiries.reference, resource_type 'award',
--   profiles.email.

create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------
create type public.publish_status as enum ('draft', 'published', 'coming_soon', 'discontinued');
create type public.enquiry_type   as enum ('rfq', 'contact', 'distributor');
create type public.enquiry_status as enum ('new', 'contacted', 'quoted', 'won', 'lost', 'spam');
create type public.resource_type  as enum ('brochure', 'datasheet', 'certificate', 'award', 'manual', 'maintenance_guide', 'other');
create type public.admin_role     as enum ('admin', 'editor', 'sales');
create type public.attr_data_type as enum ('number', 'text', 'range');

-- ------------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------------
-- Staff
-- ------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        public.admin_role not null default 'sales',
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets an INACTIVE profile. Access is granted only by an admin
-- (invite flow) or by the bootstrap SQL in docs/SETUP.md — never by sign-up metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- Catalogue
-- ------------------------------------------------------------------
create table public.categories (
  id               uuid primary key default gen_random_uuid(),
  parent_id        uuid references public.categories (id) on delete set null,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  description      text,
  image_path       text,
  sort_order       int not null default 0,
  status           public.publish_status not null default 'draft',
  seo_title        text,
  seo_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.spec_attributes (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid not null references public.categories (id) on delete cascade,
  key            text not null check (key ~ '^[a-z0-9_]+$'),
  label          text not null,
  unit           text,
  data_type      public.attr_data_type not null default 'number',
  group_label    text,
  is_key_spec    boolean not null default false,
  is_filterable  boolean not null default false,
  sort_order     int not null default 0,
  unique (category_id, key)
);

create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  category_id         uuid not null references public.categories (id) on delete restrict,
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                text not null,
  subtitle            text,
  summary             text,
  description_md      text,
  status              public.publish_status not null default 'draft',
  is_featured         boolean not null default false,
  sort_order          int not null default 0,
  facets              jsonb not null default '{}'::jsonb,   -- {"Cooling": "Air cooled"}
  highlights          jsonb not null default '[]'::jsonb,   -- [{label, value}]
  descriptive_specs   jsonb not null default '[]'::jsonb,   -- [{label, value}]
  standard_equipment  text[] not null default '{}',
  optional_extras     text[] not null default '{}',
  notes               text[] not null default '{}',
  seo_title           text,
  seo_description     text,
  og_image_path       text,
  legacy_path         text,
  search_vector       tsvector generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(summary, ''))
  ) stored,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index products_category_idx on public.products (category_id, sort_order);
create index products_search_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_models (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  model_code   text not null,
  name         text,
  status       public.publish_status not null default 'published',
  sort_order   int not null default 0,
  group_label  text,
  unique (product_id, model_code)
);
create index product_models_code_trgm_idx on public.product_models using gin (model_code extensions.gin_trgm_ops);

create table public.model_spec_values (
  model_id       uuid not null references public.product_models (id) on delete cascade,
  attribute_id   uuid not null references public.spec_attributes (id) on delete cascade,
  value_text     text,
  value_num      numeric,
  value_num_max  numeric,
  primary key (model_id, attribute_id)
);
create index model_spec_values_attr_idx on public.model_spec_values (attribute_id, value_num);

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text not null,
  alt_text      text not null check (length(trim(alt_text)) > 0),
  sort_order    int not null default 0,
  is_primary    boolean not null default false
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.applications (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  summary          text,
  body_md          text,
  image_path       text,
  sort_order       int not null default 0,
  status           public.publish_status not null default 'draft',
  seo_title        text,
  seo_description  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

create table public.product_applications (
  product_id      uuid not null references public.products (id) on delete cascade,
  application_id  uuid not null references public.applications (id) on delete cascade,
  primary key (product_id, application_id)
);

create table public.related_products (
  product_id          uuid not null references public.products (id) on delete cascade,
  related_product_id  uuid not null references public.products (id) on delete cascade,
  sort_order          int not null default 0,
  primary key (product_id, related_product_id),
  check (product_id <> related_product_id)
);

-- ------------------------------------------------------------------
-- Resources
-- ------------------------------------------------------------------
create table public.resources (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  type                public.resource_type not null,
  description         text,
  storage_path        text not null,
  file_size           bigint,
  mime_type           text,
  language            text not null default 'en',
  is_published        boolean not null default false,
  valid_from          date,
  valid_to            date,
  issuer              text,
  certificate_number  text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();

create table public.product_resources (
  product_id   uuid not null references public.products (id) on delete cascade,
  resource_id  uuid not null references public.resources (id) on delete cascade,
  primary key (product_id, resource_id)
);

create table public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer_md     text not null,
  category_id   uuid references public.categories (id) on delete set null,
  product_id    uuid references public.products (id) on delete set null,
  sort_order    int not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Leads
-- ------------------------------------------------------------------
create table public.enquiries (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique,
  type                   public.enquiry_type not null,
  status                 public.enquiry_status not null default 'new',
  product_id             uuid references public.products (id) on delete set null,
  model_id               uuid references public.product_models (id) on delete set null,
  product_name_snapshot  text,
  model_code_snapshot    text,
  quantity               int check (quantity is null or quantity > 0),
  quantity_unit          text,
  application_id         uuid references public.applications (id) on delete set null,
  application_other      text,
  destination_country    text,
  destination_city_port  text,
  timeline               text,
  name                   text not null,
  company                text,
  email                  text not null,
  phone                  text,
  buyer_country          text,
  buyer_type             text,
  message                text,
  consent                boolean not null default false,
  source_url             text,
  referrer               text,
  utm_source             text,
  utm_medium             text,
  utm_campaign           text,
  ip_hash                text,
  user_agent             text,
  notify_sent_at         timestamptz,
  notify_error           text,
  ack_sent_at            timestamptz,
  ack_error              text,
  assigned_to            uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index enquiries_created_idx on public.enquiries (created_at desc);
create index enquiries_status_idx on public.enquiries (status, created_at desc);
create index enquiries_ip_idx on public.enquiries (ip_hash, created_at desc);
create trigger enquiries_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

create table public.enquiry_events (
  id           uuid primary key default gen_random_uuid(),
  enquiry_id   uuid not null references public.enquiries (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  kind         text not null check (kind in ('status_change', 'note', 'email', 'assignment')),
  from_status  public.enquiry_status,
  to_status    public.enquiry_status,
  note         text,
  created_at   timestamptz not null default now()
);
create index enquiry_events_enquiry_idx on public.enquiry_events (enquiry_id, created_at);

-- ------------------------------------------------------------------
-- Config & audit
-- ------------------------------------------------------------------
create table public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  table_name  text not null,
  row_id      text,
  action      text not null,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.write_audit_log();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.write_audit_log();
create trigger audit_resources after insert or update or delete on public.resources for each row execute function public.write_audit_log();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.write_audit_log();
create trigger audit_site_settings after insert or update or delete on public.site_settings for each row execute function public.write_audit_log();

-- ==================== migrations/20261004000200_rls.sql ====================
-- Row-Level Security (blueprint §7.3)
-- anon: read published catalogue only. Staff access is decided by profiles.role.
-- Enquiries are inserted only by the server (service role) after validation.

create or replace function public.auth_role()
returns public.admin_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;
revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated, anon;

create or replace function public.is_staff(roles public.admin_role[])
returns boolean language sql stable as $$
  select coalesce(public.auth_role() = any (roles), false)
$$;

-- Enable RLS everywhere
alter table public.profiles             enable row level security;
alter table public.categories           enable row level security;
alter table public.spec_attributes      enable row level security;
alter table public.products             enable row level security;
alter table public.product_models       enable row level security;
alter table public.model_spec_values    enable row level security;
alter table public.product_images       enable row level security;
alter table public.applications         enable row level security;
alter table public.product_applications enable row level security;
alter table public.related_products     enable row level security;
alter table public.resources            enable row level security;
alter table public.product_resources    enable row level security;
alter table public.faqs                 enable row level security;
alter table public.enquiries            enable row level security;
alter table public.enquiry_events       enable row level security;
alter table public.site_settings        enable row level security;
alter table public.audit_log            enable row level security;

-- ---------------- Public catalogue reads ----------------
create policy "public read visible categories" on public.categories
  for select using (status in ('published', 'coming_soon', 'discontinued') or public.is_staff('{admin,editor,sales}'));

create policy "public read spec attributes" on public.spec_attributes
  for select using (true);

create policy "public read visible products" on public.products
  for select using (status in ('published', 'coming_soon', 'discontinued') or public.is_staff('{admin,editor,sales}'));

create policy "public read models of visible products" on public.product_models
  for select using (
    (status <> 'draft' and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'coming_soon', 'discontinued')))
    or public.is_staff('{admin,editor,sales}')
  );

create policy "public read spec values" on public.model_spec_values
  for select using (
    exists (
      select 1 from public.product_models m join public.products p on p.id = m.product_id
      where m.id = model_id and m.status <> 'draft' and p.status in ('published', 'coming_soon', 'discontinued')
    ) or public.is_staff('{admin,editor,sales}')
  );

create policy "public read images" on public.product_images for select using (true);
create policy "public read published applications" on public.applications
  for select using (status = 'published' or public.is_staff('{admin,editor,sales}'));
create policy "public read product applications" on public.product_applications for select using (true);
create policy "public read related" on public.related_products for select using (true);
create policy "public read published resources" on public.resources
  for select using (is_published or public.is_staff('{admin,editor,sales}'));
create policy "public read product resources" on public.product_resources for select using (true);
create policy "public read published faqs" on public.faqs
  for select using (is_published or public.is_staff('{admin,editor,sales}'));

-- Public contact settings only; notification_emails stays private.
create policy "public read contact settings" on public.site_settings
  for select using (key in ('phones', 'whatsapp', 'email', 'address_lines') or public.is_staff('{admin}'));

-- ---------------- Staff writes: catalogue (admin, editor) ----------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'spec_attributes', 'products', 'product_models', 'model_spec_values', 'product_images',
    'applications', 'product_applications', 'related_products', 'resources', 'product_resources', 'faqs'
  ] loop
    execute format('create policy "editors insert %1$s" on public.%1$I for insert to authenticated with check (public.is_staff(''{admin,editor}''))', t);
    execute format('create policy "editors update %1$s" on public.%1$I for update to authenticated using (public.is_staff(''{admin,editor}'')) with check (public.is_staff(''{admin,editor}''))', t);
    execute format('create policy "editors delete %1$s" on public.%1$I for delete to authenticated using (public.is_staff(''{admin,editor}''))', t);
  end loop;
end $$;

-- ---------------- Enquiries (admin, sales) ----------------
-- No insert policy: anon/authenticated cannot insert. The server uses the service role.
create policy "sales read enquiries" on public.enquiries
  for select to authenticated using (public.is_staff('{admin,sales}'));
create policy "sales update enquiries" on public.enquiries
  for update to authenticated using (public.is_staff('{admin,sales}')) with check (public.is_staff('{admin,sales}'));
create policy "admin delete enquiries" on public.enquiries
  for delete to authenticated using (public.is_staff('{admin}'));

create policy "sales read enquiry events" on public.enquiry_events
  for select to authenticated using (public.is_staff('{admin,sales}'));
create policy "sales add enquiry events" on public.enquiry_events
  for insert to authenticated with check (public.is_staff('{admin,sales}') and actor_id = auth.uid());

-- ---------------- Profiles ----------------
create policy "staff read own profile" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff('{admin}'));
create policy "staff list active colleagues" on public.profiles
  for select to authenticated using (public.is_staff('{admin,editor,sales}'));
create policy "admin manage profiles" on public.profiles
  for update to authenticated using (public.is_staff('{admin}')) with check (public.is_staff('{admin}'));

-- ---------------- Settings & audit (admin) ----------------
create policy "admin write settings" on public.site_settings
  for all to authenticated using (public.is_staff('{admin}')) with check (public.is_staff('{admin}'));
create policy "admin read audit log" on public.audit_log
  for select to authenticated using (public.is_staff('{admin}'));

-- ==================== migrations/20261004000300_storage.sql ====================
-- Storage buckets (blueprint §7.4). Public read; staff write.
-- Browser uploads from the admin go straight to Storage, so no file passes through
-- a Vercel function (avoids the request-body limit for large PDFs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('documents', 'documents', true, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('site-media', 'site-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "editors upload catalogue files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'documents') and public.is_staff('{admin,editor}'));

create policy "editors update catalogue files" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'documents') and public.is_staff('{admin,editor}'));

create policy "editors delete catalogue files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'documents') and public.is_staff('{admin,editor}'));

create policy "admins manage site media" on storage.objects
  for all to authenticated
  using (bucket_id = 'site-media' and public.is_staff('{admin}'))
  with check (bucket_id = 'site-media' and public.is_staff('{admin}'));

-- ==================== migrations/20261017000100_cms_media_crm.sql ====================
-- Kaushal Industries — CMS, media library and lead management (CRM) extensions.
--
-- CMS: every public page's copy lives in code as defaults (src/lib/cms/pages.ts); the database
-- stores what editors change. A page has a published version (public read), a working draft
-- (staff only) and a revision history (staff only).
--
-- CRM: enquiries gain priority, follow-up date, estimated value, tags, source and lost reason;
-- staff can add leads by hand (phone calls, trade shows) and the activity log gains more kinds.

-- ------------------------------------------------------------------
-- CMS
-- ------------------------------------------------------------------
create table public.cms_pages (
  key           text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  content       jsonb not null default '{}'::jsonb,
  published_at  timestamptz not null default now(),
  published_by  uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now()
);
create trigger cms_pages_updated_at before update on public.cms_pages
  for each row execute function public.set_updated_at();

create table public.cms_drafts (
  key         text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  content     jsonb not null,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create trigger cms_drafts_updated_at before update on public.cms_drafts
  for each row execute function public.set_updated_at();

create table public.cms_revisions (
  id          bigint generated always as identity primary key,
  key         text not null,
  content     jsonb not null,
  note        text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index cms_revisions_key_idx on public.cms_revisions (key, created_at desc);

-- ------------------------------------------------------------------
-- Media library (files uploaded to the site-media bucket)
-- ------------------------------------------------------------------
create table public.media_assets (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null default 'site-media',
  path        text not null,
  file_name   text not null,
  alt_text    text not null default '',
  mime_type   text,
  file_size   bigint,
  width       int,
  height      int,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (bucket, path)
);
create index media_assets_created_idx on public.media_assets (created_at desc);
create trigger media_assets_updated_at before update on public.media_assets
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Lead management
-- ------------------------------------------------------------------
create type public.lead_priority as enum ('low', 'normal', 'high', 'urgent');

alter table public.enquiries
  add column priority          public.lead_priority not null default 'normal',
  add column follow_up_at      timestamptz,
  add column estimated_value   numeric(14, 2) check (estimated_value is null or estimated_value >= 0),
  add column currency          text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  add column tags              text[] not null default '{}',
  add column source            text not null default 'website',
  add column lost_reason       text,
  add column last_activity_at  timestamptz not null default now();

create index enquiries_follow_up_idx on public.enquiries (follow_up_at) where follow_up_at is not null;
create index enquiries_assigned_idx on public.enquiries (assigned_to, status);
create index enquiries_tags_idx on public.enquiries using gin (tags);

alter table public.enquiry_events drop constraint if exists enquiry_events_kind_check;
alter table public.enquiry_events add constraint enquiry_events_kind_check
  check (kind in ('status_change', 'note', 'email', 'assignment', 'follow_up', 'priority', 'update', 'call', 'created'));

-- Any logged activity bumps the lead's last-activity time.
create or replace function public.touch_enquiry_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.enquiries set last_activity_at = new.created_at where id = new.enquiry_id;
  return new;
end $$;
create trigger enquiry_events_touch after insert on public.enquiry_events
  for each row execute function public.touch_enquiry_activity();

-- ------------------------------------------------------------------
-- Row-level security
-- ------------------------------------------------------------------
alter table public.cms_pages     enable row level security;
alter table public.cms_drafts    enable row level security;
alter table public.cms_revisions enable row level security;
alter table public.media_assets  enable row level security;

-- Published page content is public; drafts and history are for content staff only.
create policy "public read published pages" on public.cms_pages for select using (true);
create policy "editors write pages" on public.cms_pages
  for all to authenticated using (public.is_staff('{admin,editor}')) with check (public.is_staff('{admin,editor}'));

create policy "editors manage drafts" on public.cms_drafts
  for all to authenticated using (public.is_staff('{admin,editor}')) with check (public.is_staff('{admin,editor}'));

create policy "editors read revisions" on public.cms_revisions
  for select to authenticated using (public.is_staff('{admin,editor}'));
create policy "editors add revisions" on public.cms_revisions
  for insert to authenticated with check (public.is_staff('{admin,editor}') and created_by = auth.uid());
create policy "admins prune revisions" on public.cms_revisions
  for delete to authenticated using (public.is_staff('{admin}'));

create policy "public read media" on public.media_assets for select using (true);
create policy "editors manage media" on public.media_assets
  for all to authenticated using (public.is_staff('{admin,editor}')) with check (public.is_staff('{admin,editor}'));

-- Staff can log leads by hand (phone, email, trade show). Website enquiries still arrive
-- through the server (service role) after validation.
create policy "sales add enquiries" on public.enquiries
  for insert to authenticated with check (public.is_staff('{admin,sales}'));

-- Editors may now manage site media (previously administrators only).
drop policy if exists "admins manage site media" on storage.objects;
create policy "editors manage site media" on storage.objects
  for all to authenticated
  using (bucket_id = 'site-media' and public.is_staff('{admin,editor}'))
  with check (bucket_id = 'site-media' and public.is_staff('{admin,editor}'));

-- ------------------------------------------------------------------
-- Audit
-- ------------------------------------------------------------------
-- Rows keyed by `key` (CMS pages, settings) are logged under their key.
create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_cms_pages after insert or update or delete on public.cms_pages
  for each row execute function public.write_audit_log();
create trigger audit_media_assets after insert or update or delete on public.media_assets
  for each row execute function public.write_audit_log();
create trigger audit_applications after insert or update or delete on public.applications
  for each row execute function public.write_audit_log();
create trigger audit_faqs after insert or update or delete on public.faqs
  for each row execute function public.write_audit_log();
create trigger audit_enquiries after update or delete on public.enquiries
  for each row execute function public.write_audit_log();

-- ==================== migrations/20261017000200_audit_skip_bookkeeping.sql ====================
-- Activity log: skip updates that only touch bookkeeping columns (updated_at, last_activity_at,
-- search_vector). Adding a note to a lead bumps last_activity_at, which otherwise logs an
-- "updated" entry with no visible change.

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  bookkeeping text[] := array['updated_at', 'last_activity_at', 'search_vector'];
begin
  if tg_op = 'UPDATE' and (to_jsonb(old) - bookkeeping) = (to_jsonb(new) - bookkeeping) then
    return new;
  end if;
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- ==================== seed.sql ====================
-- GENERATED by scripts/generate-seed-sql.ts from src/lib/data/seed.ts — do not edit by hand.
-- Catalogue migrated from www.kia-india.com (crawled 4 Oct 2026).
begin;

-- Categories
insert into public.categories (slug, name, description, image_path, sort_order, status, seo_title, seo_description) values ('diesel-engines', 'Diesel Engines', 'Stationary, constant-speed four-stroke diesel engines in air-cooled and water-cooled, high-speed and slow-speed builds — single and double cylinder.', '/images/products/high-speed-air-cooled-single.png', 1, 'published'::public.publish_status, 'Stationary Diesel Engines — Air & Water Cooled', null) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, image_path, sort_order, status, seo_title, seo_description) values ('generating-sets', 'Generating Sets', 'Air-cooled diesel generating sets, single phase 1–20 kVA, with 60 Hz, dual-voltage, AMF panel and canopy options. Higher ratings on request.', '/images/products/air-cooled-generating-set.png', 2, 'published'::public.publish_status, 'Diesel Generating Sets — 1 to 20 kVA', null) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, image_path, sort_order, status, seo_title, seo_description) values ('pumps', 'Pumps', 'Centrifugal water pumps from 2.5″ × 2″ to 6″ × 6″, direct coupled or belt driven — the pump end of a Kaushal diesel pumping set.', '/images/products/centrifugal-water-pump.png', 3, 'published'::public.publish_status, 'Centrifugal Water Pumps', null) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, image_path, sort_order, status, seo_title, seo_description) values ('agricultural-machinery', 'Agricultural Machinery', 'Corn grinders (molinos) and coffee pulpers, built to run from Kaushal stationary diesel engines.', '/images/products/corn-grinder.png', 4, 'published'::public.publish_status, 'Agricultural Machinery — Corn Grinders & Coffee Pulpers', null) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, image_path, sort_order, status, seo_title, seo_description) values ('castings', 'Castings', 'Graded grey iron and SG iron castings — from in-house tool making to finish machining.', '/images/products/castings-foundry.png', 5, 'published'::public.publish_status, 'Grey Iron & SG Iron Castings', null) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, image_path, sort_order, status, seo_title, seo_description) values ('spare-parts', 'Spare Parts', 'Spare parts for Kaushal diesel engines, generating sets, pumps and agricultural machines.', '/images/products/spare-parts.png', 6, 'published'::public.publish_status, 'Spare Parts for Diesel Engines, Gensets & Pumps', null) on conflict (slug) do nothing;

-- Spec attribute dictionary
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'power_bhp', 'Rated power', 'bhp', 'number'::public.attr_data_type, 'Performance', true, true, 1 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'power_kw', 'Rated power', 'kW', 'number'::public.attr_data_type, 'Performance', true, false, 2 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'speed_rpm', 'Speed', 'rpm', 'number'::public.attr_data_type, 'Performance', true, false, 3 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'bore_mm', 'Bore', 'mm', 'number'::public.attr_data_type, 'Engine', false, false, 4 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'stroke_mm', 'Stroke', 'mm', 'number'::public.attr_data_type, 'Engine', false, false, 5 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'sfc_g_kwh', 'SFC at full load', 'g/kWh', 'number'::public.attr_data_type, 'Performance', false, false, 6 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'fuel_tank_l', 'Fuel tank capacity', 'L', 'number'::public.attr_data_type, 'Engine', false, false, 7 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'lube_oil', 'Lube oil consumption', null, 'text'::public.attr_data_type, 'Performance', false, false, 8 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'crank_height_mm', 'Crankshaft centre height', 'mm', 'number'::public.attr_data_type, 'Dimensions', false, false, 9 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'net_weight_kg', 'Approx. net weight', 'kg', 'number'::public.attr_data_type, 'Weights & packing', false, false, 10 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'gross_weight_kg', 'Approx. gross weight', 'kg', 'number'::public.attr_data_type, 'Weights & packing', false, false, 11 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;
insert into public.spec_attributes (category_id, key, label, unit, data_type, group_label, is_key_spec, is_filterable, sort_order) select id, 'case_size_cm', 'Approx. case size (L×W×H)', 'cm', 'text'::public.attr_data_type, 'Weights & packing', false, false, 12 from public.categories where slug = 'diesel-engines' on conflict (category_id, key) do nothing;

-- Applications
insert into public.applications (slug, name, summary, body_md, image_path, sort_order, status) values ('agriculture', 'Agriculture', 'Stationary engines that run mills, choppers and pumping sets on the farm.', 'Kaushal engines were first built to serve Indian agriculture, and farm machinery is still their most common duty. A constant-speed stationary engine drives belt-driven machines reliably with simple, local maintenance.

Typical installations:
- Molinos (corn grinders) with diesel engine
- Picadoras (chaff cutters) with diesel engine
- Diesel pumping sets for field irrigation', '/images/products/corn-grinder.png', 1, 'published') on conflict (slug) do nothing;
insert into public.applications (slug, name, summary, body_md, image_path, sort_order, status) values ('irrigation', 'Irrigation', 'Diesel pumping sets — an engine coupled to a centrifugal pump — for lifting and moving water.', 'A diesel pumping set pairs a Kaushal engine with a centrifugal water pump, direct coupled or belt driven. Pump sizes run from 2.5″ × 2″ to 6″ × 6″, matched to the engine''s rated power.

Typical installations:
- Diesel engine with water pump
- Belt-driven pumping sets
- Water transfer for fields, ponds and storage', '/images/products/centrifugal-water-pump.png', 2, 'published') on conflict (slug) do nothing;
insert into public.applications (slug, name, summary, body_md, image_path, sort_order, status) values ('power-generation', 'Power Generation', 'Generating sets and engines coupled to 50 Hz and 60 Hz alternators.', 'Our air-cooled generating sets cover 1–20 kVA single phase as standard, with 60 Hz, dual-voltage, AMF panel and sound-proof canopy options. Engines can also be supplied for coupling to your own alternator.

Typical installations:
- Diesel engine with 50 Hz generators
- Diesel engine with 60 Hz generators
- Welding generators', '/images/products/air-cooled-generating-set.png', 3, 'published') on conflict (slug) do nothing;
insert into public.applications (slug, name, summary, body_md, image_path, sort_order, status) values ('construction', 'Construction', 'Engines for concrete mixers and site equipment.', 'Constant-speed diesel engines are a proven power source for concrete mixers and other site machinery where mains power is not available.

Typical installations:
- Concrete mixers with diesel engine
- Site pumps and dewatering', '/images/products/high-speed-air-cooled-double.png', 4, 'published') on conflict (slug) do nothing;
insert into public.applications (slug, name, summary, body_md, image_path, sort_order, status) values ('food-processing', 'Food Processing', 'Corn grinders and coffee pulpers for primary processing of grain and coffee.', 'Engine-driven grain mills and coffee pulpers bring primary processing to the farm gate.

Typical installations:
- Corn grinders (molinos) for maize and grain
- Coffee pulpers for removing pulp from coffee cherries', '/images/products/coffee-pulper.png', 5, 'published') on conflict (slug) do nothing;

-- Products
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'high-speed-air-cooled-diesel-engine', 'High Speed Air Cooled Diesel Engine', 'Single and double cylinder', 'Compact air-cooled stationary engines for agriculture, power and construction duty — 16 models from 3.5 to 28 bhp.', 'A vertical, four-stroke, constant-speed diesel engine with no radiator or water circuit to maintain — the simplest way to power a pump, mill, mixer or alternator in the field.

Available in single-cylinder and double-cylinder builds, with radial (cowling) or axial (blower) cooling and a long list of factory options.', 'published'::public.publish_status, true, 1, '{"Cooling":"Air cooled","Speed class":"High speed"}'::jsonb, '[]'::jsonb, '[{"label":"Type","value":"Vertical, four-stroke, constant-speed, stationary, compression-ignition internal combustion engine."},{"label":"Rotation","value":"Standard rotation is clockwise, facing the flywheel."},{"label":"Combustion","value":"Open-type combustion chamber in an aluminium-alloy piston."},{"label":"Bearings","value":"Taper-roller main bearings on single-cylinder and copper-lead bush on double-cylinder engines. Bi-metal alloy big-end bearings; phosphor-bronze valve-rocker and small-end bushes; sintered camshaft bush."},{"label":"Cylinder head","value":"Cast iron, detachable, designed for adequate cooling."},{"label":"Gears & drives","value":"Cast-iron timing gears. Power take-off from the flywheel end only."},{"label":"Fuel system","value":"Gravity feed to the fuel pump."},{"label":"Lubrication","value":"Force feed to big-end and main bearings — plunger-type oil pump on single-cylinder, gear-type on double-cylinder engines."},{"label":"Governing","value":"Fixed-speed centrifugal governor mounted on the camshaft gear wheel; speed variation held within limits."},{"label":"Balancing","value":"Two balance weights bolted to the crankshaft; balanced flywheel for smooth running and long life of moving parts."},{"label":"Exhaust","value":"Pepper-pot type silencer."},{"label":"Air cleaner","value":"Oil-bath type or FRITZ paper-felt air cleaner."},{"label":"Starting","value":"Hand start. A 12 V electric starting system can also be supplied."}]'::jsonb, array['Starting handle', 'Wrench set', 'Silencer', 'Screwdriver', 'Air cleaner']::text[], array['Anti-clockwise rotation', 'Radial (cowling) or axial (blower) cooling', '12 V electric start with alternator for battery charging', 'Extended crankshaft / extension shaft with coupling in various sizes', 'Speed variator / variable-speed attachment', 'Pulleys to buyer''s requirements', 'Oil pressure gauge, hour meter, and auto-stop for low oil pressure and high temperature', 'Bearing type (taper-roller main bearings, plunger oil pump) or bush type (copper-lead bush, gear oil pump) on single-cylinder engines']::text[], array['All declarations are for standard engines.']::text[], '/HighSpeedAirCooledDieselEngine.html', now()
from public.categories where slug = 'diesel-engines' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'high-speed-water-cooled-diesel-engine', 'High Speed Water Cooled Diesel Engine', 'Single and double cylinder', 'Water-cooled stationary engines for continuous duty in agriculture, power and construction — 16 models from 3.5 to 28 bhp.', 'The water-cooled counterpart of our high-speed range, for installations that run long hours in hot conditions.

The gear cover is cast iron with a long extension shaft, supported by its own housing and lubrication.', 'published'::public.publish_status, true, 2, '{"Cooling":"Water cooled","Speed class":"High speed"}'::jsonb, '[]'::jsonb, '[{"label":"Type","value":"Vertical, four-stroke, constant-speed, stationary, compression-ignition internal combustion engine."},{"label":"Rotation","value":"Standard rotation is clockwise, facing the flywheel."},{"label":"Combustion","value":"Open-type combustion chamber in an aluminium-alloy piston."},{"label":"Bearings","value":"Taper-roller main bearings on single-cylinder and copper-lead bush on double-cylinder engines. Bi-metal alloy big-end bearings; phosphor-bronze valve-rocker and small-end bushes; sintered camshaft bush."},{"label":"Cylinder head","value":"Cast iron, detachable, designed for adequate cooling."},{"label":"Gears & drives","value":"Cast-iron timing gears. Power take-off from the flywheel end only."},{"label":"Fuel system","value":"Gravity feed to the fuel pump."},{"label":"Lubrication","value":"Force feed to big-end and main bearings — plunger-type oil pump on single-cylinder, gear-type on double-cylinder engines."},{"label":"Governing","value":"Fixed-speed centrifugal governor mounted on the camshaft gear wheel; speed variation held within limits."},{"label":"Balancing","value":"Two balance weights bolted to the crankshaft; balanced flywheel for smooth running and long life of moving parts."},{"label":"Exhaust","value":"Pepper-pot type silencer."},{"label":"Air cleaner","value":"Oil-bath type or FRITZ paper-felt air cleaner."},{"label":"Starting","value":"Hand start. A 12 V electric starting system can also be supplied."}]'::jsonb, array['Starting handle', 'Wrench set', 'Silencer', 'Screwdriver', 'Air cleaner']::text[], array['Anti-clockwise rotation', '12 V electric start with alternator for battery charging', 'Extended crankshaft / extension shaft with coupling in various sizes', 'Speed variator / variable-speed attachment', 'Pulleys to buyer''s requirements', 'Oil pressure gauge, hour meter, and auto-stop for low oil pressure and high temperature', 'Bearing type (taper-roller main bearings, plunger oil pump) or bush type (copper-lead bush, gear oil pump) on single-cylinder engines']::text[], array['Gear cover is cast iron with a long extension shaft, with extra support of housing and lubrication.', 'All declarations are for standard engines.']::text[], '/HighSpeedWaterCooledDieselEngine.html', now()
from public.categories where slug = 'diesel-engines' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'slow-speed-water-cooled-diesel-engine', 'Slow Speed Water Cooled Diesel Engine', 'Single and double cylinder, twin flywheel', 'Heavy, slow-running engines with indirect injection and twin balanced flywheels — 6 models from 8 to 20 bhp at 850–1000 rpm.', 'A traditional slow-speed design built for longevity: the combustion chamber sits in the cylinder head with indirect fuel injection, and the engine is balanced by two flywheels.

Power can be taken off from either flywheel end.', 'published'::public.publish_status, true, 3, '{"Cooling":"Water cooled","Speed class":"Slow speed"}'::jsonb, '[]'::jsonb, '[{"label":"Type","value":"Vertical, four-stroke, constant-speed, stationary, compression-ignition internal combustion engine."},{"label":"Rotation","value":"Standard rotation is anti-clockwise, facing the power take-off side."},{"label":"Combustion","value":"Combustion chamber in the cylinder head, with indirect injection of fuel."},{"label":"Bearings","value":"Taper-roller main bearings on single-cylinder and copper-lead bush on double-cylinder engines. Bi-metal alloy big-end bearings; phosphor-bronze valve-rocker and small-end bushes; cast-iron camshaft bush."},{"label":"Cylinder head","value":"Cast iron, detachable, designed for adequate cooling."},{"label":"Gears & drives","value":"Cast-iron timing gears. Power take-off from either flywheel end."},{"label":"Fuel system","value":"Gravity feed to the fuel pump."},{"label":"Lubrication","value":"Splash lubrication through a dipper on the connecting rod. A plunger-type oil pump can also be supplied."},{"label":"Governing","value":"Fixed-speed centrifugal governor mounted on the camshaft gear wheel; speed variation held within limits."},{"label":"Balancing","value":"Two balanced flywheels as standard. Balancing through two weights bolted to the crankshaft can also be supplied."},{"label":"Exhaust","value":"Pepper-pot type silencer."},{"label":"Air cleaner","value":"Oil-bath type or FRITZ paper-felt air cleaner."},{"label":"Starting","value":"Hand start."}]'::jsonb, array['Starting handle', 'Wrench set', 'Silencer', 'Screwdriver', 'Air cleaner']::text[], array['Balance-weight type engines on request']::text[], array['EL1: taper-roller main bearings. EL2: bush-type main bearings.', 'All declarations are for standard engines.']::text[], '/SlowSpeedWaterCooledDieselEngine.html', now()
from public.categories where slug = 'diesel-engines' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'slow-speed-air-cooled-diesel-engine', 'Slow Speed Air Cooled Diesel Engine', '15–28 bhp · 1500–1600 rpm', 'An air-cooled range listed at 15–28 bhp and 1500–1600 rpm. Full specifications are being finalised — register your interest.', 'Technical specifications for this range are being finalised. Send us an enquiry with your power requirement and application and we will share the current specification.', 'coming_soon'::public.publish_status, false, 4, '{"Cooling":"Air cooled","Speed class":"Slow speed"}'::jsonb, '[{"label":"Rated power","value":"15–28 bhp"},{"label":"Speed","value":"1500–1600 rpm"}]'::jsonb, '[]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], '/SlowSpeedAirCooledDieselEngine.html', null
from public.categories where slug = 'diesel-engines' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'air-cooled-generating-sets', 'Air Cooled Generating Sets', 'Single phase · 1–20 kVA', 'Diesel generating sets built on our air-cooled engines — single phase from 1 to 20 kVA, with 50 Hz, 60 Hz and dual-voltage alternators.', 'An air-cooled Kaushal diesel engine coupled to an alternator on a common base — simple to install, simple to service.

Ratings outside the standard range — up to 65 kVA for generating sets and 82.5 kVA for A.C. generators — can be offered on specific request. Welding generators and welding alternators are also available.', 'published'::public.publish_status, true, 1, '{"Cooling":"Air cooled","Phase":"Single phase"}'::jsonb, '[{"label":"Output","value":"1–20 kVA"},{"label":"Phase","value":"Single phase"},{"label":"Frequency","value":"50 Hz; 60 Hz available"},{"label":"Voltage","value":"Single or dual voltage"}]'::jsonb, '[]'::jsonb, '{}'::text[], array['Radial (cowling) or axial (blower) type engine', 'Bearing type or bush type single-cylinder engine', '12 V electric start with alternator for battery charging', 'Control panel and AMF panel', '60 Hz generators / A.C. generators', 'Dual-voltage generators / A.C. generators', 'Sound-proofing canopy', 'Ratings up to 65 kVA (generating sets) and 82.5 kVA (A.C. generators) on request', 'Welding generators / welding alternators']::text[], '{}'::text[], '/AirCooledGenSetsSinglePhase.html', now()
from public.categories where slug = 'generating-sets' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'water-cooled-generating-sets', 'Water Cooled Generating Sets', 'Double cylinder', 'Double-cylinder water-cooled generating sets. Specifications are being finalised — register your interest.', 'Technical specifications for this range are being finalised. Tell us your required output, phase, frequency and voltage and we will respond with a proposal.', 'coming_soon'::public.publish_status, false, 2, '{"Cooling":"Water cooled"}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], null, null
from public.categories where slug = 'generating-sets' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'centrifugal-water-pumps', 'Centrifugal Water Pumps', '2.5″ × 2″ to 6″ × 6″', 'Centrifugal water pumps, direct coupled or belt driven, from 2.5″ × 2″ to 6″ × 6″ — larger sizes on request.', 'Paired with a Kaushal diesel engine, these pumps form a complete diesel pumping set for irrigation and water transfer.

Available direct coupled or belt driven, with volute or split casings.', 'published'::public.publish_status, true, 1, '{"Drive":"Direct coupled / belt driven"}'::jsonb, '[{"label":"Size (suction × delivery)","value":"2.5″ × 2″ to 6″ × 6″ (65 × 50 mm to 150 × 150 mm)"},{"label":"Drive","value":"Direct coupled or belt driven"},{"label":"Casing","value":"Volute or split casing"}]'::jsonb, '[]'::jsonb, '{}'::text[], array['Belt-driven pumps on request', 'Sizes above 6″ × 6″ on request']::text[], '{}'::text[], '/CentrifugalWaterPumps.html', now()
from public.categories where slug = 'pumps' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'corn-grinder', 'Corn Grinder (Molino)', 'Engine-driven grain mill', 'A belt-driven corn grinder (molino) for milling maize and grain, designed to run from a Kaushal stationary diesel engine.', 'Supplied as a stand-alone mill or as a complete set with a Kaushal diesel engine. Tell us your engine preference and required output in your enquiry.', 'published'::public.publish_status, true, 1, '{}'::jsonb, '[{"label":"Drive","value":"Belt driven from a stationary diesel engine"}]'::jsonb, '[]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], '/CornGrinder.html', now()
from public.categories where slug = 'agricultural-machinery' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'coffee-pulper', 'Coffee Pulper', 'Primary coffee processing', 'A coffee pulper for removing the skin and pulp from coffee cherries, with a hopper feed.', 'Built for primary coffee processing at farm level. Supplied as a stand-alone machine or as a set with a Kaushal diesel engine.', 'published'::public.publish_status, false, 2, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], '/CoffeePulper.html', now()
from public.categories where slug = 'agricultural-machinery' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'grey-iron-and-sg-iron-castings', 'Grey Iron & SG Iron Castings', 'Kaushal Castings, Dholpur', 'Graded grey iron and SG iron castings for engineering, agriculture, automotive and domestic use — pattern to finish-machined part.', 'Our foundry, Kaushal Castings, was established in 1964 at Agra and moved to Dholpur, Rajasthan, in 2002. It produces graded grey iron castings — ornamental and decorative castings, machinery components and agricultural castings — alongside SG iron with special moulding lines.

The facility covers in-house tool and pattern making, sand and investment casting, shot blasting, grinding and finish machining. Send us your drawings or samples; if you can supply a pattern it helps, otherwise we can develop one.', 'published'::public.publish_status, false, 1, '{}'::jsonb, '[{"label":"Materials","value":"Graded grey cast iron, SG iron"},{"label":"Processes","value":"Sand casting, investment casting"},{"label":"Finishing","value":"Shot blasting, grinding, machining"},{"label":"Testing","value":"Metallurgical analysis, hardness testing"}]'::jsonb, '[]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], '/Castings.html', now()
from public.categories where slug = 'castings' on conflict (slug) do nothing;
insert into public.products (category_id, slug, name, subtitle, summary, description_md, status, is_featured, sort_order, facets, highlights, descriptive_specs, standard_equipment, optional_extras, notes, legacy_path, published_at)
select id, 'spare-parts', 'Spare Parts', 'Engines, generating sets, pumps and machines', 'Replacement parts for Kaushal diesel engines, generating sets, centrifugal pumps, agricultural machines and castings.', 'Quote the engine or machine model and the part you need — or send a photo — and our team will confirm availability and lead time.', 'published'::public.publish_status, false, 1, '{}'::jsonb, '[{"label":"Covers","value":"Diesel engines, generating sets, centrifugal pumps, agricultural machines, castings"}]'::jsonb, '[]'::jsonb, '{}'::text[], '{}'::text[], '{}'::text[], '/SpareParts.html', now()
from public.categories where slug = 'spare-parts' on conflict (slug) do nothing;

-- Models
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EO1A', 'Single cylinder', 1, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'ER1A', 'Single cylinder', 2, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EA1A', 'Single cylinder', 3, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EB1A', 'Single cylinder', 4, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EC1A', 'Single cylinder', 5, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'ED1A', 'Single cylinder', 6, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EE1A', 'Single cylinder', 7, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EF1A', 'Single cylinder', 8, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EF1XA', 'Single cylinder', 9, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EM1A', 'Single cylinder', 10, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EP1A', 'Single cylinder', 11, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EG1A', 'Double cylinder', 12, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EH1A', 'Double cylinder', 13, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EI1A', 'Double cylinder', 14, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EI1XA', 'Double cylinder', 15, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EJ1A', 'Double cylinder', 16, 'published' from public.products where slug = 'high-speed-air-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EO1', 'Single cylinder', 1, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'ER1', 'Single cylinder', 2, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EA1', 'Single cylinder', 3, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EB1', 'Single cylinder', 4, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EC1', 'Single cylinder', 5, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'ED1', 'Single cylinder', 6, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EE1', 'Single cylinder', 7, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EF1', 'Single cylinder', 8, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EF1X', 'Single cylinder', 9, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EM1', 'Single cylinder', 10, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EP1', 'Single cylinder', 11, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EG1', 'Double cylinder', 12, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EH1', 'Double cylinder', 13, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EI1', 'Double cylinder', 14, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EI1X', 'Double cylinder', 15, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EJ1', 'Double cylinder', 16, 'published' from public.products where slug = 'high-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EK1A', 'Single cylinder', 1, 'published' from public.products where slug = 'slow-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EK1B', 'Single cylinder', 2, 'published' from public.products where slug = 'slow-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EK1C', 'Single cylinder', 3, 'published' from public.products where slug = 'slow-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EQ1', 'Single cylinder', 4, 'published' from public.products where slug = 'slow-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EL1', 'Double cylinder', 5, 'published' from public.products where slug = 'slow-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;
insert into public.product_models (product_id, model_code, group_label, sort_order, status) select id, 'EL2', 'Double cylinder', 6, 'published' from public.products where slug = 'slow-speed-water-cooled-diesel-engine' on conflict (product_id, model_code) do nothing;

-- Model spec values
insert into public.model_spec_values (model_id, attribute_id, value_text, value_num)
select m.id, a.id, v.t, v.n::numeric
from (values
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'power_bhp', null, 3.5),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'power_kw', null, 2.6),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'bore_mm', null, 80),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'stroke_mm', null, 80),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'fuel_tank_l', null, 4),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'crank_height_mm', null, 148.5),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'net_weight_kg', null, 85),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'gross_weight_kg', null, 95),
  ('high-speed-air-cooled-diesel-engine', 'EO1A', 'case_size_cm', '55 × 50 × 75', null),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'power_bhp', null, 5),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'power_kw', null, 3.7),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'bore_mm', null, 85),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'stroke_mm', null, 80),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'fuel_tank_l', null, 4),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'crank_height_mm', null, 148.5),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'net_weight_kg', null, 85),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'gross_weight_kg', null, 95),
  ('high-speed-air-cooled-diesel-engine', 'ER1A', 'case_size_cm', '55 × 50 × 75', null),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'power_bhp', null, 5),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'power_kw', null, 3.7),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'bore_mm', null, 80),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'fuel_tank_l', null, 7.5),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'net_weight_kg', null, 150),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'gross_weight_kg', null, 165),
  ('high-speed-air-cooled-diesel-engine', 'EA1A', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'power_bhp', null, 6.5),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'power_kw', null, 4.8),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'bore_mm', null, 85),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'fuel_tank_l', null, 7.5),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'net_weight_kg', null, 150),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'gross_weight_kg', null, 165),
  ('high-speed-air-cooled-diesel-engine', 'EB1A', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'power_bhp', null, 7.5),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'power_kw', null, 5.5),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'bore_mm', null, 87.5),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'net_weight_kg', null, 170),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'gross_weight_kg', null, 190),
  ('high-speed-air-cooled-diesel-engine', 'EC1A', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'power_bhp', null, 8),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'power_kw', null, 5.9),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'speed_rpm', null, 1600),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'bore_mm', null, 87.5),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'net_weight_kg', null, 170),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'gross_weight_kg', null, 190),
  ('high-speed-air-cooled-diesel-engine', 'ED1A', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'power_bhp', null, 9),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'power_kw', null, 6.6),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'bore_mm', null, 95),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'net_weight_kg', null, 180),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'gross_weight_kg', null, 200),
  ('high-speed-air-cooled-diesel-engine', 'EE1A', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'power_bhp', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'power_kw', null, 7.4),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'bore_mm', null, 102),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'net_weight_kg', null, 180),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'gross_weight_kg', null, 200),
  ('high-speed-air-cooled-diesel-engine', 'EF1A', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'power_bhp', null, 12),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'power_kw', null, 8.8),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'speed_rpm', null, 1600),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'bore_mm', null, 102),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'net_weight_kg', null, 180),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'gross_weight_kg', null, 200),
  ('high-speed-air-cooled-diesel-engine', 'EF1XA', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'power_bhp', null, 14),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'power_kw', null, 10.3),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'bore_mm', null, 114.3),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'net_weight_kg', null, 190),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'gross_weight_kg', null, 210),
  ('high-speed-air-cooled-diesel-engine', 'EM1A', 'case_size_cm', '60 × 50 × 95', null),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'power_bhp', null, 15),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'power_kw', null, 11),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'speed_rpm', null, 1600),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'bore_mm', null, 114.3),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'stroke_mm', null, 115),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'crank_height_mm', null, 230.2),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'net_weight_kg', null, 230),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'gross_weight_kg', null, 250),
  ('high-speed-air-cooled-diesel-engine', 'EP1A', 'case_size_cm', '60 × 50 × 95', null),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'power_bhp', null, 15),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'power_kw', null, 11),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'bore_mm', null, 87.5),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'net_weight_kg', null, 260),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'gross_weight_kg', null, 290),
  ('high-speed-air-cooled-diesel-engine', 'EG1A', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'power_bhp', null, 18),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'power_kw', null, 13.2),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'bore_mm', null, 95),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'net_weight_kg', null, 260),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'gross_weight_kg', null, 290),
  ('high-speed-air-cooled-diesel-engine', 'EH1A', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'power_bhp', null, 20),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'power_kw', null, 14.7),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'bore_mm', null, 102),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'net_weight_kg', null, 260),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'gross_weight_kg', null, 290),
  ('high-speed-air-cooled-diesel-engine', 'EI1A', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'power_bhp', null, 24),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'power_kw', null, 17.7),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'speed_rpm', null, 1600),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'bore_mm', null, 102),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'net_weight_kg', null, 260),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'gross_weight_kg', null, 290),
  ('high-speed-air-cooled-diesel-engine', 'EI1XA', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'power_bhp', null, 28),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'power_kw', null, 20.6),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'speed_rpm', null, 1500),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'bore_mm', null, 114.3),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'stroke_mm', null, 110),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'sfc_g_kwh', null, 240),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'fuel_tank_l', null, 10),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'crank_height_mm', null, 203.2),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'net_weight_kg', null, 270),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'gross_weight_kg', null, 300),
  ('high-speed-air-cooled-diesel-engine', 'EJ1A', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'power_bhp', null, 3.5),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'power_kw', null, 2.6),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'bore_mm', null, 80),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'stroke_mm', null, 80),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'fuel_tank_l', null, 4),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'crank_height_mm', null, 148.5),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'net_weight_kg', null, 85),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'gross_weight_kg', null, 95),
  ('high-speed-water-cooled-diesel-engine', 'EO1', 'case_size_cm', '55 × 50 × 75', null),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'power_bhp', null, 5),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'power_kw', null, 3.7),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'bore_mm', null, 85),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'stroke_mm', null, 80),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'fuel_tank_l', null, 4),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'crank_height_mm', null, 148.5),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'net_weight_kg', null, 85),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'gross_weight_kg', null, 95),
  ('high-speed-water-cooled-diesel-engine', 'ER1', 'case_size_cm', '55 × 50 × 75', null),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'power_bhp', null, 5),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'power_kw', null, 3.7),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'bore_mm', null, 80),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'fuel_tank_l', null, 7.5),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'net_weight_kg', null, 150),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'gross_weight_kg', null, 165),
  ('high-speed-water-cooled-diesel-engine', 'EA1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'power_bhp', null, 6.5),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'power_kw', null, 4.8),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'bore_mm', null, 85),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'fuel_tank_l', null, 7.5),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'net_weight_kg', null, 150),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'gross_weight_kg', null, 165),
  ('high-speed-water-cooled-diesel-engine', 'EB1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'power_bhp', null, 7.5),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'power_kw', null, 5.5),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'bore_mm', null, 87.5),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'net_weight_kg', null, 170),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'gross_weight_kg', null, 190),
  ('high-speed-water-cooled-diesel-engine', 'EC1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'power_bhp', null, 8),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'power_kw', null, 5.9),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'speed_rpm', null, 1600),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'bore_mm', null, 87.5),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'net_weight_kg', null, 170),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'gross_weight_kg', null, 190),
  ('high-speed-water-cooled-diesel-engine', 'ED1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'power_bhp', null, 9),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'power_kw', null, 6.6),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'bore_mm', null, 95),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'net_weight_kg', null, 180),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'gross_weight_kg', null, 200),
  ('high-speed-water-cooled-diesel-engine', 'EE1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'power_bhp', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'power_kw', null, 7.4),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'bore_mm', null, 102),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'net_weight_kg', null, 180),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'gross_weight_kg', null, 200),
  ('high-speed-water-cooled-diesel-engine', 'EF1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'power_bhp', null, 12),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'power_kw', null, 8.8),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'speed_rpm', null, 1600),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'bore_mm', null, 102),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'net_weight_kg', null, 180),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'gross_weight_kg', null, 200),
  ('high-speed-water-cooled-diesel-engine', 'EF1X', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'power_bhp', null, 14),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'power_kw', null, 10.3),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'bore_mm', null, 114.3),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'net_weight_kg', null, 190),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'gross_weight_kg', null, 210),
  ('high-speed-water-cooled-diesel-engine', 'EM1', 'case_size_cm', '60 × 50 × 80', null),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'power_bhp', null, 15),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'power_kw', null, 11),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'speed_rpm', null, 1600),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'bore_mm', null, 114.3),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'stroke_mm', null, 115),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'crank_height_mm', null, 230.2),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'net_weight_kg', null, 230),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'gross_weight_kg', null, 250),
  ('high-speed-water-cooled-diesel-engine', 'EP1', 'case_size_cm', '60 × 50 × 95', null),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'power_bhp', null, 15),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'power_kw', null, 11),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'bore_mm', null, 87.5),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'net_weight_kg', null, 260),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'gross_weight_kg', null, 290),
  ('high-speed-water-cooled-diesel-engine', 'EG1', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'power_bhp', null, 18),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'power_kw', null, 13.2),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'bore_mm', null, 95),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'net_weight_kg', null, 260),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'gross_weight_kg', null, 290),
  ('high-speed-water-cooled-diesel-engine', 'EH1', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'power_bhp', null, 20),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'power_kw', null, 14.7),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'bore_mm', null, 102),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'net_weight_kg', null, 260),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'gross_weight_kg', null, 290),
  ('high-speed-water-cooled-diesel-engine', 'EI1', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'power_bhp', null, 24),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'power_kw', null, 17.7),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'speed_rpm', null, 1600),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'bore_mm', null, 102),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'net_weight_kg', null, 260),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'gross_weight_kg', null, 290),
  ('high-speed-water-cooled-diesel-engine', 'EI1X', 'case_size_cm', '85 × 60 × 85', null),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'power_bhp', null, 28),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'power_kw', null, 20.6),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'speed_rpm', null, 1500),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'bore_mm', null, 114.3),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'stroke_mm', null, 110),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'sfc_g_kwh', null, 240),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'fuel_tank_l', null, 10),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'crank_height_mm', null, 203.2),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'net_weight_kg', null, 270),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'gross_weight_kg', null, 300),
  ('high-speed-water-cooled-diesel-engine', 'EJ1', 'case_size_cm', '85 × 60 × 85', null),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'power_bhp', null, 8),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'power_kw', null, 5.9),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'speed_rpm', null, 850),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'bore_mm', null, 120),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'stroke_mm', null, 139.7),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'sfc_g_kwh', null, 265),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'fuel_tank_l', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'net_weight_kg', null, 300),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'gross_weight_kg', null, 330),
  ('slow-speed-water-cooled-diesel-engine', 'EK1A', 'case_size_cm', '100 × 70 × 110', null),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'power_bhp', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'power_kw', null, 6.6),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'speed_rpm', null, 950),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'bore_mm', null, 120),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'stroke_mm', null, 139.7),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'sfc_g_kwh', null, 265),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'fuel_tank_l', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'net_weight_kg', null, 300),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'gross_weight_kg', null, 330),
  ('slow-speed-water-cooled-diesel-engine', 'EK1B', 'case_size_cm', '100 × 70 × 110', null),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'power_bhp', null, 10),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'power_kw', null, 7.36),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'speed_rpm', null, 1000),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'bore_mm', null, 120),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'stroke_mm', null, 139.7),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'sfc_g_kwh', null, 265),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'fuel_tank_l', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'net_weight_kg', null, 300),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'gross_weight_kg', null, 330),
  ('slow-speed-water-cooled-diesel-engine', 'EK1C', 'case_size_cm', '100 × 70 × 110', null),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'power_bhp', null, 12),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'power_kw', null, 8.8),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'speed_rpm', null, 1000),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'bore_mm', null, 127),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'stroke_mm', null, 139.7),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'sfc_g_kwh', null, 265),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'fuel_tank_l', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'net_weight_kg', null, 350),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'gross_weight_kg', null, 380),
  ('slow-speed-water-cooled-diesel-engine', 'EQ1', 'case_size_cm', '100 × 70 × 120', null),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'power_bhp', null, 16),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'power_kw', null, 11.8),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'speed_rpm', null, 1000),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'bore_mm', null, 114.3),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'stroke_mm', null, 139.7),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'sfc_g_kwh', null, 265),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'fuel_tank_l', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'net_weight_kg', null, 480),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'gross_weight_kg', null, 520),
  ('slow-speed-water-cooled-diesel-engine', 'EL1', 'case_size_cm', '135 × 70 × 105', null),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'lube_oil', 'Less than 0.3% of SFC', null),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'power_bhp', null, 20),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'power_kw', null, 14.7),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'speed_rpm', null, 1000),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'bore_mm', null, 120),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'stroke_mm', null, 139.7),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'sfc_g_kwh', null, 265),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'fuel_tank_l', null, 9),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'net_weight_kg', null, 480),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'gross_weight_kg', null, 520),
  ('slow-speed-water-cooled-diesel-engine', 'EL2', 'case_size_cm', '135 × 70 × 105', null)
) as v(product_slug, model_code, attr_key, t, n)
join public.products p on p.slug = v.product_slug
join public.product_models m on m.product_id = p.id and m.model_code = v.model_code
join public.spec_attributes a on a.category_id = p.category_id and a.key = v.attr_key
on conflict (model_id, attribute_id) do nothing;

-- Images, applications, related products
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/high-speed-air-cooled-single.png', 'High speed air cooled single-cylinder diesel engine, green, with fuel tank and air cleaner', 1, true from public.products where slug = 'high-speed-air-cooled-diesel-engine' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'high-speed-air-cooled-diesel-engine' and pi.storage_path = '/images/products/high-speed-air-cooled-single.png');
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/high-speed-air-cooled-double.png', 'High speed air cooled double-cylinder diesel engine with blower cooling', 2, false from public.products where slug = 'high-speed-air-cooled-diesel-engine' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'high-speed-air-cooled-diesel-engine' and pi.storage_path = '/images/products/high-speed-air-cooled-double.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-air-cooled-diesel-engine' and a.slug = 'agriculture' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-air-cooled-diesel-engine' and a.slug = 'irrigation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-air-cooled-diesel-engine' and a.slug = 'power-generation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-air-cooled-diesel-engine' and a.slug = 'construction' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'high-speed-air-cooled-diesel-engine' and r.slug = 'high-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'high-speed-air-cooled-diesel-engine' and r.slug = 'slow-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 3 from public.products p, public.products r where p.slug = 'high-speed-air-cooled-diesel-engine' and r.slug = 'air-cooled-generating-sets' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/high-speed-water-cooled-single.png', 'High speed water cooled single-cylinder diesel engine with hopper and fuel tank', 1, true from public.products where slug = 'high-speed-water-cooled-diesel-engine' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'high-speed-water-cooled-diesel-engine' and pi.storage_path = '/images/products/high-speed-water-cooled-single.png');
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/high-speed-water-cooled-double.png', 'High speed water cooled double-cylinder diesel engine', 2, false from public.products where slug = 'high-speed-water-cooled-diesel-engine' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'high-speed-water-cooled-diesel-engine' and pi.storage_path = '/images/products/high-speed-water-cooled-double.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-water-cooled-diesel-engine' and a.slug = 'agriculture' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-water-cooled-diesel-engine' and a.slug = 'irrigation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-water-cooled-diesel-engine' and a.slug = 'power-generation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'high-speed-water-cooled-diesel-engine' and a.slug = 'construction' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'high-speed-water-cooled-diesel-engine' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'high-speed-water-cooled-diesel-engine' and r.slug = 'slow-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 3 from public.products p, public.products r where p.slug = 'high-speed-water-cooled-diesel-engine' and r.slug = 'centrifugal-water-pumps' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/slow-speed-water-cooled.png', 'Slow speed water cooled diesel engine with twin flywheels', 1, true from public.products where slug = 'slow-speed-water-cooled-diesel-engine' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'slow-speed-water-cooled-diesel-engine' and pi.storage_path = '/images/products/slow-speed-water-cooled.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'slow-speed-water-cooled-diesel-engine' and a.slug = 'agriculture' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'slow-speed-water-cooled-diesel-engine' and a.slug = 'irrigation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'slow-speed-water-cooled-diesel-engine' and a.slug = 'power-generation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'slow-speed-water-cooled-diesel-engine' and a.slug = 'construction' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'slow-speed-water-cooled-diesel-engine' and r.slug = 'high-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'slow-speed-water-cooled-diesel-engine' and r.slug = 'centrifugal-water-pumps' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 3 from public.products p, public.products r where p.slug = 'slow-speed-water-cooled-diesel-engine' and r.slug = 'corn-grinder' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/slow-speed-air-cooled.png', 'Slow speed diesel engine with twin flywheels, blue', 1, true from public.products where slug = 'slow-speed-air-cooled-diesel-engine' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'slow-speed-air-cooled-diesel-engine' and pi.storage_path = '/images/products/slow-speed-air-cooled.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'slow-speed-air-cooled-diesel-engine' and a.slug = 'agriculture' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'slow-speed-air-cooled-diesel-engine' and a.slug = 'power-generation' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'slow-speed-air-cooled-diesel-engine' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/air-cooled-generating-set.png', 'Air cooled diesel generating set with alternator on a common base', 1, true from public.products where slug = 'air-cooled-generating-sets' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'air-cooled-generating-sets' and pi.storage_path = '/images/products/air-cooled-generating-set.png');
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/air-cooled-generating-set-2.png', 'Air cooled diesel generating set, side view', 2, false from public.products where slug = 'air-cooled-generating-sets' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'air-cooled-generating-sets' and pi.storage_path = '/images/products/air-cooled-generating-set-2.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'air-cooled-generating-sets' and a.slug = 'power-generation' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'air-cooled-generating-sets' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'air-cooled-generating-sets' and r.slug = 'water-cooled-generating-sets' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/air-cooled-generating-set-2.png', 'Diesel generating set', 1, true from public.products where slug = 'water-cooled-generating-sets' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'water-cooled-generating-sets' and pi.storage_path = '/images/products/air-cooled-generating-set-2.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'water-cooled-generating-sets' and a.slug = 'power-generation' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'water-cooled-generating-sets' and r.slug = 'air-cooled-generating-sets' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'water-cooled-generating-sets' and r.slug = 'high-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/centrifugal-water-pump.png', 'Green centrifugal water pump with flanged suction and delivery', 1, true from public.products where slug = 'centrifugal-water-pumps' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'centrifugal-water-pumps' and pi.storage_path = '/images/products/centrifugal-water-pump.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'centrifugal-water-pumps' and a.slug = 'irrigation' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'centrifugal-water-pumps' and a.slug = 'agriculture' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'centrifugal-water-pumps' and r.slug = 'slow-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'centrifugal-water-pumps' and r.slug = 'high-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 3 from public.products p, public.products r where p.slug = 'centrifugal-water-pumps' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/corn-grinder.png', 'Corn grinder (molino) with pulley and hopper', 1, true from public.products where slug = 'corn-grinder' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'corn-grinder' and pi.storage_path = '/images/products/corn-grinder.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'corn-grinder' and a.slug = 'food-processing' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'corn-grinder' and a.slug = 'agriculture' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'corn-grinder' and r.slug = 'coffee-pulper' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'corn-grinder' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 3 from public.products p, public.products r where p.slug = 'corn-grinder' and r.slug = 'slow-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/coffee-pulper.png', 'Red coffee pulper with hopper and flywheel', 1, true from public.products where slug = 'coffee-pulper' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'coffee-pulper' and pi.storage_path = '/images/products/coffee-pulper.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'coffee-pulper' and a.slug = 'food-processing' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'coffee-pulper' and a.slug = 'agriculture' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'coffee-pulper' and r.slug = 'corn-grinder' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'coffee-pulper' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/castings-foundry.png', 'Molten iron being poured into a mould at the Kaushal foundry', 1, true from public.products where slug = 'grey-iron-and-sg-iron-castings' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'grey-iron-and-sg-iron-castings' and pi.storage_path = '/images/products/castings-foundry.png');
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'grey-iron-and-sg-iron-castings' and a.slug = 'agriculture' on conflict do nothing;
insert into public.product_applications (product_id, application_id) select p.id, a.id from public.products p, public.applications a where p.slug = 'grey-iron-and-sg-iron-castings' and a.slug = 'construction' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'grey-iron-and-sg-iron-castings' and r.slug = 'spare-parts' on conflict do nothing;
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary) select id, '/images/products/spare-parts.png', 'Assorted diesel engine spare parts including belts, filters and pistons', 1, true from public.products where slug = 'spare-parts' and not exists (select 1 from public.product_images pi join public.products pp on pp.id = pi.product_id where pp.slug = 'spare-parts' and pi.storage_path = '/images/products/spare-parts.png');
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 1 from public.products p, public.products r where p.slug = 'spare-parts' and r.slug = 'high-speed-air-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 2 from public.products p, public.products r where p.slug = 'spare-parts' and r.slug = 'high-speed-water-cooled-diesel-engine' on conflict do nothing;
insert into public.related_products (product_id, related_product_id, sort_order) select p.id, r.id, 3 from public.products p, public.products r where p.slug = 'spare-parts' and r.slug = 'slow-speed-water-cooled-diesel-engine' on conflict do nothing;

-- Resources (certificates & awards)
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'Quality policy', 'certificate'::public.resource_type, 'Our signed quality policy.', '/images/certificates/quality-policy.jpg', 'image/jpeg', null, 'Kaushal Industries', null::date, null::date, 1, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/quality-policy.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'Export House certificate', 'certificate'::public.resource_type, 'Recognised export house, 2015–2020.', '/images/certificates/export-house-certificate-2015-20.jpg', 'image/jpeg', null, 'Government of India', null::date, '2020-03-31'::date, 2, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/export-house-certificate-2015-20.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'District Industries Centre registration', 'certificate'::public.resource_type, null, '/images/certificates/dic-certificate.jpg', 'image/jpeg', null, 'District Industries Centre', null::date, null::date, 3, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/dic-certificate.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'Dun & Bradstreet registration', 'certificate'::public.resource_type, null, '/images/certificates/dun-bradstreet-certificate.jpg', 'image/jpeg', null, 'Dun & Bradstreet', null::date, null::date, 4, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/dun-bradstreet-certificate.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'UP Export Promotion Bureau certificate', 'certificate'::public.resource_type, null, '/images/certificates/upepb-certificate.jpg', 'image/jpeg', null, 'Uttar Pradesh Export Promotion Bureau', null::date, null::date, 5, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/upepb-certificate.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC India membership', 'certificate'::public.resource_type, null, '/images/certificates/eepc-certificate-1.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 6, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-certificate-1.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC India certificate', 'certificate'::public.resource_type, null, '/images/certificates/eepc-certificate-2.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 7, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-certificate-2.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC export award 2010–11', 'award'::public.resource_type, null, '/images/certificates/eepc-award-2010-11.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 8, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-award-2010-11.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC export award 2009–10', 'award'::public.resource_type, null, '/images/certificates/eepc-award-2009-10.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 9, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-award-2009-10.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC export award 2008–09', 'award'::public.resource_type, null, '/images/certificates/eepc-award-2008-09.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 10, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-award-2008-09.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC export award 2007–08', 'award'::public.resource_type, null, '/images/certificates/eepc-award-2007-08.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 11, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-award-2007-08.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC export award 2006–07', 'award'::public.resource_type, null, '/images/certificates/eepc-award-2006-07.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 12, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-award-2006-07.jpg');
insert into public.resources (title, type, description, storage_path, mime_type, file_size, issuer, valid_from, valid_to, sort_order, is_published) select 'EEPC export award 2005–06', 'award'::public.resource_type, null, '/images/certificates/eepc-award-2005-06.jpg', 'image/jpeg', null, 'EEPC India', null::date, null::date, 13, true where not exists (select 1 from public.resources where storage_path = '/images/certificates/eepc-award-2005-06.jpg');

-- FAQs
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'What power range do your diesel engines cover?', 'Our published models run from 3.5 to 28 bhp across three families: high speed air cooled, high speed water cooled and slow speed water cooled. Ask us for ratings outside this range.', (select id from public.categories where slug = 'diesel-engines'), 1, true where not exists (select 1 from public.faqs where question = 'What power range do your diesel engines cover?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'Can the engines be supplied with electric start?', 'Yes. A 12 V electric start system with an alternator for battery charging is available as an option on high-speed engines and generating sets.', (select id from public.categories where slug = 'diesel-engines'), 2, true where not exists (select 1 from public.faqs where question = 'Can the engines be supplied with electric start?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'Which way do the engines rotate?', 'High-speed engines rotate clockwise facing the flywheel as standard, with anti-clockwise rotation available as an option. Slow-speed water-cooled engines rotate anti-clockwise facing the power take-off side.', (select id from public.categories where slug = 'diesel-engines'), 3, true where not exists (select 1 from public.faqs where question = 'Which way do the engines rotate?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'What is supplied as standard equipment with an engine?', 'Every standard engine ships with a starting handle, wrench set, silencer, screwdriver and air cleaner.', (select id from public.categories where slug = 'diesel-engines'), 4, true where not exists (select 1 from public.faqs where question = 'What is supplied as standard equipment with an engine?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'Do you offer 60 Hz or dual-voltage generating sets?', 'Yes. 60 Hz and dual-voltage generators and A.C. generators are available, along with control and AMF panels and sound-proofing canopies.', (select id from public.categories where slug = 'generating-sets'), 5, true where not exists (select 1 from public.faqs where question = 'Do you offer 60 Hz or dual-voltage generating sets?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'What pump sizes are available?', 'Centrifugal water pumps from 2.5″ × 2″ to 6″ × 6″, direct coupled or belt driven. Larger sizes can be offered on request.', (select id from public.categories where slug = 'pumps'), 6, true where not exists (select 1 from public.faqs where question = 'What pump sizes are available?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'Do you export, and where?', 'Yes. We supply buyers in the Indian sub-continent, the Middle East, the Far East, Australia, Africa, Europe and the Americas — more than 60 countries in all.', null, 7, true where not exists (select 1 from public.faqs where question = 'Do you export, and where?');
insert into public.faqs (question, answer_md, category_id, sort_order, is_published) select 'How do I request a quotation?', 'Use the Request a Quote button on any product page — the product is filled in for you. Add the quantity, application, destination and timeline, and our team will reply by email.', null, 8, true where not exists (select 1 from public.faqs where question = 'How do I request a quotation?');

-- Site settings (public contact values; notification_emails is private)
insert into public.site_settings (key, value) values ('phones', '["+91 97197 01128","+91 70377 50480"]'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('whatsapp', '"+91 97197 01128"'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('email', '"kia@kia-india.com"'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('address_lines', '["12/55, Nagla Balchand, Nunhai","Agra 282006, Uttar Pradesh","India"]'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('notification_emails', '["kia@kia-india.com"]'::jsonb) on conflict (key) do nothing;

commit;

-- ==================== seed-cms.sql ====================
-- GENERATED by scripts/generate-cms-seed.mts from src/lib/cms/pages.ts — do not edit by hand.
-- Publishes the default content of every CMS page. Existing pages are not overwritten.
begin;

insert into public.cms_pages (key, content) values ('global', '{"footer":{"description":"Kaushal Industries manufactures and exports stationary diesel engines, diesel generating sets, centrifugal water pumps, agricultural machinery and castings from Agra, India — since 1964."},"cta":{"label":"Request for quotation","title":"Tell us the model, quantity and destination.","lead":"We''ll reply with a quotation.","button":"Request a quote"},"lists":{"exportRegions":["Indian sub-continent","Middle East","Far East Asia","Australia","Africa","Europe","The Americas"],"buyerTypes":["Importers and distributors","Wholesalers and private retailers","Government and semi-government organisations, including UN bodies","Export houses in New Delhi and Mumbai"]}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('home', '{"seo":{"title":"Kaushal Industries — Diesel Engines, Generating Sets & Pumps | Agra, India","description":"Kaushal Industries manufactures and exports stationary diesel engines, diesel generating sets, centrifugal water pumps, agricultural machinery and castings from Agra, India — since 1964."},"hero":{"eyebrow":"Manufacturer & exporter · Agra, India","kicker":"Diesel engines, generating sets and pumps","display1":"made in Agra","display2":"since 1964.","rangeLabel":"Product range","lead":"Stationary engines, pumping sets, gensets and castings, supplied to buyers in more than 60 countries.","specs":[{"label":"Rated power","value":"3.5–28","unit":"bhp"},{"label":"Speed","value":"850–1600","unit":"rpm"},{"label":"Cooling","value":"Air & water","unit":""}],"primaryCta":"Explore products","secondaryCta":"Request a quote"},"proof":{"items":[{"value":"1964","label":"First manufacturing unit, Agra"},{"value":"60+","label":"Countries supplied"},{"value":"{models}","label":"Published engine models"},{"value":"ISO 9001:2015","label":"Quality management system"}]},"range":{"label":"Product range","title":"Six product lines, one manufacturer.","lead":"From the engine to the pump, alternator, mill and the castings inside them.","linkLabel":"All products"},"marquee":{"items":["Diesel engines","Generating sets","Centrifugal pumps","Agricultural machinery","Grey & SG iron castings","Spare parts","Exported to 60+ countries"]},"industries":{"label":"Industries served","title":"Built for the field, the farm and the site.","lead":"Find the right engine, set or machine for the job it will do."},"quality":{"eyebrow":"Quality & certifications","title":"ISO 9001:2015 quality management, and up to two years warranty.","linkLabel":"Quality, certificates & awards","sealText":"ISO 9001:2015 · Quality management system · Up to two years warranty · "},"export":{"eyebrow":"Export markets","body":"Supplying importers, distributors and governments in 60+ countries.","linkLabel":"Export capability"},"order":{"label":"How to order","title":"From model to quotation in three steps.","steps":[{"title":"Choose a product","body":"Browse a family, compare models in the spec table, or use the model finder to filter by power."},{"title":"Send your requirement","body":"Press “Request a quote” — the product is filled in. Add quantity, application, destination and timeline."},{"title":"Receive a quotation","body":"Our sales team reviews your enquiry and replies by email with pricing, lead time and shipping options."}]}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('about', '{"seo":{"title":"About Kaushal Industries — Manufacturer & Exporter Since 1964","description":"Kaushal Group set up its first manufacturing unit in Agra in 1964. Today Kaushal Industries and Kaushal Castings manufacture engines, pumping sets, generating sets and castings for 60+ countries."},"hero":{"eyebrow":"About Kaushal Industries","title":"Power for agriculture, built in Agra since 1964.","lead":"India needed power, fast — specifically for agriculture and irrigation. Kaushal Group was founded to build it, and has been manufacturing diesel engines and allied products ever since."},"intro":{"label":"Introduction","images":[{"image":"/images/products/slow-speed-water-cooled.png","alt":"Slow speed water cooled diesel engine","fit":"contain"},{"image":"/images/products/centrifugal-water-pump.png","alt":"Centrifugal water pump","fit":"contain"},{"image":"/images/products/air-cooled-generating-set.png","alt":"Air cooled generating set","fit":"contain"},{"image":"/images/products/castings-foundry.png","alt":"Molten iron being poured at the Kaushal foundry","fit":"cover"}],"paragraphs":[{"text":"Movement is an essential ingredient of progress — even more so for independent India, a vast sub-continent that needed power for its farms. The founders of Kaushal Group chose to manufacture for the core of India''s agricultural development."},{"text":"Our units manufacture diesel engines, diesel pumping sets, diesel generating sets, centrifugal pumps and castings. Once the products found acceptance in domestic markets, we took them to international markets — today buyers in more than 60 countries."},{"text":"Technology, training, automation and management systems are upgraded continuously to keep pace with developments in our field."}]},"history":{"label":"History","title":"Six decades of movement.","items":[{"year":"1964","title":"First unit in Agra","body":"Kaushal Group sets up its first manufacturing unit in Agra, Uttar Pradesh, building engines for agriculture and irrigation."},{"year":"Growth","title":"Into export markets","body":"Once the products earn acceptance in India, the group expands into international markets."},{"year":"2002","title":"Foundry moves to Dholpur","body":"Kaushal Castings relocates to Dholpur, Rajasthan, 55 km from Agra, as the group''s dedicated foundry."},{"year":"Today","title":"60+ countries","body":"Engines, pumping sets, generating sets and castings supplied across six continents."}]},"capability":{"label":"Manufacturing capability","title":"Engine, pump, alternator coupling and foundry under one group.","lead":"From pattern to finished, tested product — the work stays in-house.","items":[{"title":"Engine manufacture","body":"Air-cooled and water-cooled, high-speed and slow-speed stationary diesel engines in single and double cylinder builds."},{"title":"Generating & pumping sets","body":"Engines coupled to alternators and centrifugal pumps on common bases, with panels, canopies and electric start as options."},{"title":"In-house foundry","body":"Grey iron and SG iron casting with in-house tool making, sand and investment casting, and special moulding lines."},{"title":"Machining & finishing","body":"Shot blasting, grinding and finish machining of cast components."},{"title":"Testing","body":"Metallurgical analysis and hardness testing to control the physical and chemical properties of castings."},{"title":"Custom builds","body":"Anti-clockwise rotation, extended crankshafts, pulleys, speed variators and safety cut-outs to buyer requirements."}]},"group":{"eyebrow":"Kaushal Group","title":"A composite group of manufacturers and exporters.","companies":[{"name":"Kaushal Industries","location":"Agra, Uttar Pradesh","body":"Manufacturer of stationary diesel engines, diesel pumping sets, diesel generating sets and centrifugal water pumps."},{"name":"Kaushal Castings","location":"Dholpur, Rajasthan","body":"Foundry producing graded grey iron and SG iron castings for engineering, agriculture, automotive and domestic use."},{"name":"International trading","location":"Agra","body":"Export of the group''s own products alongside GI pipes, deep-well hand pumps and spares, ceramic sanitary ware, and ceramic wall and floor tiles."}]},"export":{"eyebrow":"Export experience","title":"Buyers on six continents.","body":"We supply importers, distributors, wholesalers and government and semi-government organisations — including bodies of the UN — as well as leading export houses in New Delhi and Mumbai.","linkLabel":"Export capability"},"team":{"eyebrow":"Our team","title":"People are the most important asset.","body":"Our management brings deep experience across production, finance, marketing and general management. We have built a qualified, dynamic team that strives for perfection in every field of operation.","quote":"“Movement is progress, and for us it has been the reason and the result.”"},"leadership":{"label":"Leadership","title":"The people behind Kaushal.","people":[]}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('quality-certifications', '{"seo":{"title":"Quality, Certifications & Awards","description":"Kaushal Industries'' quality policy, in-house quality controls, ISO 9001:2015 quality management system, current certificates, export awards and warranty."},"hero":{"eyebrow":"Quality & certifications","title":"Right first time, every time.","lead":"Kaushal Industries is committed to producing and delivering products to customer specification — first time, every time."},"policy":{"label":"Quality policy","title":"Our working philosophy.","philosophy":["Understand customer needs and fulfil them.","Deliver products of the right quality at the lowest possible price.","Improve continuously to maximise customer satisfaction."],"objectivesLabel":"Quality objectives","objectives":["99% on-time delivery","100% customer satisfaction"]},"controls":{"label":"Testing & quality controls","title":"Controlled from casting to finished engine.","items":[{"title":"Standard engine declarations","body":"Every published specification is declared for our standard engines, so you can compare models like for like."},{"title":"Metallurgical analysis","body":"Castings are checked for chemical composition at our foundry before machining."},{"title":"Hardness testing","body":"Hardness is tested in-house to confirm the physical properties of each casting batch."},{"title":"Machining and finishing","body":"Shot blasting, grinding and machining are done in-house, keeping quality under one roof."}]},"band":{"eyebrow":"Certification","title":"Quality management system — ISO 9001:2015.","warrantyLabel":"Warranty","warrantyHeadline":"Up to 2 years warranty","warrantyBody":"Our engines carry a warranty of up to two years. Coverage depends on the product and application — the terms for your order are confirmed with your quotation."},"evidence":{"certificatesLabel":"Downloadable evidence","certificatesTitle":"Certificates & registrations.","certificatesLead":"Open any certificate to view or save the full-size document.","awardsLabel":"Recognition","awardsTitle":"Export awards.","awardsLead":"Awarded by EEPC India for export performance."}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('export-markets', '{"seo":{"title":"Export Markets — Engines, Pumps & Gensets Supplied to 60+ Countries","description":"Kaushal Industries exports diesel engines, pumping sets, generating sets and castings to the Middle East, Africa, Asia, Australia, Europe and the Americas. Distributor enquiries welcome."},"hero":{"eyebrow":"Export markets","title":"From Agra to more than 60 countries.","lead":"We supply importers, distributors and government buyers worldwide — and the export houses of New Delhi and Mumbai."},"regions":{"label":"Regions served","title":"Six continents, one specification.","countries":"60+ countries"},"capabilities":{"items":[{"icon":"box","title":"Packing for export","body":"Every engine model is published with its approximate packed case size and gross weight, so you can plan container loads and freight before you ask for a quotation.","link":{"label":"See case sizes by model","href":"/products/diesel-engines#model-finder"}},{"icon":"file","title":"Documentation","body":"Tell us your destination country and import requirements in your enquiry; we confirm the export documents we will provide with your quotation.","link":{"label":"","href":""}},{"icon":"ship","title":"Logistics","body":"Share your destination port or city and required timeline. We quote lead time and shipping options for your order.","link":{"label":"","href":""}}]},"buyers":{"eyebrow":"Who we supply","title":"Trusted by trade and government buyers."},"distributors":{"eyebrow":"Distributor enquiries","title":"Represent Kaushal engines and pumps in your market.","body":"Tell us about your company, territory and the product lines you are interested in.","button":"Become a distributor"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('products', '{"seo":{"title":"Products — Diesel Engines, Generating Sets, Pumps & Castings","description":"Browse Kaushal Industries'' full range: stationary diesel engines, diesel generating sets, centrifugal water pumps, agricultural machinery, castings and spare parts."},"hero":{"eyebrow":"Products","title":"The complete Kaushal range.","lead":"Six product lines, each manufactured and tested in-house. Choose a category to compare families and models."},"labels":{"viewCategory":"View {category}"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('applications', '{"seo":{"title":"Applications & Industries","description":"Diesel engines, pumping sets, generating sets and machinery for agriculture, irrigation, power generation, construction and food processing."},"hero":{"eyebrow":"Applications & industries","title":"Matched to the work it will do.","lead":"Start from your application and we''ll point you to the engines, sets and machines built for it."},"labels":{"cardLink":"Products for {application}"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('resources', '{"seo":{"title":"Resources — Brochures, Data Sheets, Certificates & FAQs","description":"Download Kaushal Industries brochures, technical data sheets and certificates, and find answers to common questions about our engines, generating sets and pumps."},"hero":{"eyebrow":"Resources","title":"Documents and answers.","lead":"Brochures, data sheets, certificates and the questions buyers ask most often."},"empty":{"title":"Need a brochure or data sheet?","body":"Full specifications for every published model are on each product page — print any page as a spec sheet. For a brochure, ask us and we''ll email it.","linkLabel":"Request documents"},"sections":{"certificatesNav":"Certificates & awards","certificatesLabel":"Evidence","certificatesTitle":"Certificates & awards.","faqsNav":"FAQs","faqsTitle":"Questions buyers ask.","faqsPrompt":"Can''t find your answer?"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('contact', '{"seo":{"title":"Contact Kaushal Industries — Agra, India","description":"Contact Kaushal Industries, 12/55 Nagla Balchand, Nunhai, Agra 282006, India. Call, WhatsApp or email our sales team, or send us a message."},"hero":{"eyebrow":"Contact","title":"Talk to our sales team.","lead":"Call, WhatsApp or email us — or send a message below. For pricing, the quickest route is a request for quotation."},"form":{"title":"Send a message","lead":"General questions, spares, documents or anything else."},"address":{"contactLabel":"Contact","contactPerson":"Avnish Kaushal","mapLabel":"Kaushal Industries, Nunhai, Agra"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('request-a-quote', '{"seo":{"title":"Request a Quote","description":"Request a quotation for Kaushal diesel engines, generating sets, pumps, agricultural machinery, castings or spare parts. Tell us the product, quantity, destination and timeline."},"hero":{"eyebrow":"Request for quotation","title":"Request a quote","titleWithProduct":"Quote for the {product}","lead":"Tell us what you need, how many, and where it''s going. We''ll reply with pricing, lead time and shipping options.","replyNote":"Reply by email, usually within one business day","whatsappLabel":"WhatsApp us"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('thank-you', '{"messages":{"rfqTitle":"Your quotation request is in.","messageTitle":"Thank you — message received.","lead":"Our team will reply by email, usually within one business day.","emailSent":"A confirmation has been sent to your inbox.","reference":"Your reference:","browse":"Continue browsing","home":"Home","missingEmail":"Didn''t get the confirmation email? Check your spam folder or","addSomething":"Need to add something?","contactLink":"contact us directly"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('search', '{"hero":{"eyebrow":"Search","title":"Find a product or model.","placeholder":"Try “EF1A”, “water cooled” or “irrigation”"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('not-found', '{"hero":{"eyebrow":"404","title":"This page has moved or doesn''t exist.","lead":"Our website has a new structure. Search for a product or model code, or start from the product range.","placeholder":"Product or model code","productsButton":"View products","contactButton":"Contact us","pricePrompt":"Looking for a price?","priceLink":"Request a quote"}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('privacy-policy', '{"seo":{"title":"Privacy Policy","description":"How Kaushal Industries collects, uses and protects the personal data you share through this website."},"page":{"title":"Privacy policy","updated":"October 2026","body":"This policy explains how {company} (“we”, “us”) handles personal data collected through {domain}. We collect only what we need to answer your enquiry and improve this website.\n\n## What we collect\n\n- **Enquiry details** you submit through our quotation, distributor and contact forms: your name, company, email address, phone number, country, buyer type, and the details of your requirement (product, model, quantity, application, destination and timeline, and your message).\n- **Technical data** sent with a form submission: the page you submitted from, your browser’s user agent, and a one-way hash of your IP address used to prevent spam. We do not store your raw IP address.\n- **Analytics data**, only if you allow analytics cookies: pages viewed, products viewed, downloads and form interactions, collected through Google Analytics via Google Tag Manager.\n\n## How we use it\n\n- To respond to your enquiry, prepare quotations and follow up on your request.\n- To send you an acknowledgement of your enquiry by email.\n- To protect the website and our team from spam and abuse.\n- To understand, in aggregate, how buyers use this website, if you have allowed analytics.\n\nWe do not sell your personal data and we do not use it for advertising.\n\n## Who processes it\n\nEnquiries are stored in our database hosted by Supabase and delivered to our sales team by email through our transactional email provider. If you allow analytics, Google processes analytics data. Loading the interactive map on our contact page shares data with Google Maps. These providers process data on our behalf under their own terms.\n\n## Cookies\n\nWe use analytics cookies only with your consent, which you can change at any time through “Cookie settings” in the footer. Our administrators’ sign-in uses strictly necessary cookies. We set no advertising cookies.\n\n## How long we keep it\n\nWe keep enquiry records for as long as needed to respond to you, manage any resulting business relationship, and meet our legal and accounting obligations, after which they are deleted.\n\n## Your rights\n\nYou may ask us to access, correct or delete the personal data we hold about you, or withdraw your consent, by emailing [{email}](mailto:{email}). We will respond within a reasonable time and in line with applicable law, including India’s Digital Personal Data Protection Act, 2023.\n\n## Contact\n\n{company}, {address}. Email [{email}](mailto:{email})."}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('website-terms', '{"seo":{"title":"Website Terms of Use","description":"Terms governing the use of the Kaushal Industries website."},"page":{"title":"Website terms of use","updated":"October 2026","body":"By using this website you accept these terms. If you do not agree, please do not use the website.\n\n## Information on this website\n\nProduct information, specifications and images are provided for general guidance and relate to our standard products. They do not form an offer or a contract. Specifications may change without notice; please confirm them with us before ordering. See our [disclaimer](/disclaimer).\n\n## Quotations and orders\n\nSubmitting a request for quotation does not create a contract. Any sale is governed by the quotation, order confirmation and terms we issue to you directly.\n\n## Intellectual property\n\nThe content of this website — text, images, specifications, logos and design — belongs to {company} or its licensors. You may view, print and download it for evaluating our products; any other use requires our written permission.\n\n## Acceptable use\n\nYou must not misuse this website, including by submitting false enquiries, attempting to gain unauthorised access, or interfering with its operation.\n\n## Links\n\nWe are not responsible for the content of third-party websites linked from this site.\n\n## Liability\n\nTo the extent permitted by law, we are not liable for any loss arising from use of, or reliance on, this website.\n\n## Governing law\n\nThese terms are governed by the laws of India.\n\n## Contact\n\nQuestions about these terms: [{email}](mailto:{email})."}}'::jsonb) on conflict (key) do nothing;
insert into public.cms_pages (key, content) values ('disclaimer', '{"seo":{"title":"Disclaimer","description":"Disclaimer for information and specifications published on the Kaushal Industries website."},"page":{"title":"Disclaimer","updated":"October 2026","body":"The information and data on this website are provided with the greatest care and in good faith. We do not claim them to be complete or free of error. To the best of our knowledge they are correct for the purpose of giving an idea of the quality of our products and to assist you in making a decision. All declarations are for our standard products; please confirm specifications with us before ordering."}}'::jsonb) on conflict (key) do nothing;

commit;

