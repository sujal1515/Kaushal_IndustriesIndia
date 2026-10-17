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
