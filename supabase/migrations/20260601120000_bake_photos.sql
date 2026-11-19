-- Loaf photos for finished bakes.
-- 1. bake_sessions.photo_path: where the photo lives in Storage (null = no photo).
-- 2. A PRIVATE storage bucket "bake-photos": JPEG only, 1 MB cap per file. The app compresses
--    photos to roughly 250 KB before uploading.
-- 3. Row Level Security on storage.objects: a user can only touch objects inside the folder
--    named after their own user id, i.e. "<user_id>/<bake_session_id>.jpg".
-- Safe to run more than once.

alter table public.bake_sessions
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bake-photos', 'bake-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg'];

drop policy if exists "Users read own bake photos" on storage.objects;
create policy "Users read own bake photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'bake-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users insert own bake photos" on storage.objects;
create policy "Users insert own bake photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bake-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own bake photos" on storage.objects;
create policy "Users update own bake photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bake-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'bake-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own bake photos" on storage.objects;
create policy "Users delete own bake photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bake-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
