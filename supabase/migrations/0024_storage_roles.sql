-- Storage writes follow the role model (companion to 0023).
--
-- 0020 let ANY member of a school write inside its avatar folder — that
-- now includes student/parent/pending accounts, who have no business
-- uploading or deleting the school's photos. Uploads become staff-only
-- (admin/staff/finance/teacher); public read is unchanged.

drop policy if exists "avatars: authenticated upload" on storage.objects;
create policy "avatars: authenticated upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.is_school_staff()
  );

drop policy if exists "avatars: authenticated update" on storage.objects;
create policy "avatars: authenticated update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.is_school_staff()
  );

drop policy if exists "avatars: authenticated delete" on storage.objects;
create policy "avatars: authenticated delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.is_school_staff()
  );
