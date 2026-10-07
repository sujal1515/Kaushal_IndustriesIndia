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
