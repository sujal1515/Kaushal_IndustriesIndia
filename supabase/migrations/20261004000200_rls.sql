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
