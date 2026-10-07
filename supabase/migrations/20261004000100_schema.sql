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
