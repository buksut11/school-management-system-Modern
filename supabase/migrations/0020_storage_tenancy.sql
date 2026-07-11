-- Tenant isolation for uploads (multi-tenant follow-up to 0019).
--
-- The avatars bucket allowed any signed-in user to upload/update/delete
-- ANY object — in a multi-tenant world that means one school's staff
-- could overwrite or delete another school's photos. Objects now live
-- under a per-school prefix (<school_id>/students/..., set by the app's
-- upload helper) and writes are only allowed inside the caller's own
-- school folder. Public read stays: avatar URLs are unguessable UUIDs
-- and the app displays them cross-page.

drop policy if exists "avatars: authenticated upload" on storage.objects;
create policy "avatars: authenticated upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );

drop policy if exists "avatars: authenticated update" on storage.objects;
create policy "avatars: authenticated update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );

drop policy if exists "avatars: authenticated delete" on storage.objects;
create policy "avatars: authenticated delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
  );
