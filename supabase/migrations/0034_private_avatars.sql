-- Private avatars (audit finding 2.3).
--
-- Student and teacher photos — images of mostly minors — lived in a
-- PUBLIC bucket: the URLs were unguessable UUIDs, but anyone who ever
-- obtained one could fetch the photo forever, with no auth and no
-- revocation. The bucket is now private:
--
--   • reads require a signed-in member of the SAME school (students and
--     parents included — the family dashboard shows their child's
--     photo); everyone else, including the anonymous public, gets
--     nothing. Old public links stop working the moment this runs.
--   • the app serves photos through short-lived signed URLs it mints
--     per request (see lib/data/photos.ts), so a leaked link expires on
--     its own.
--   • photo_url columns now store the bare storage PATH
--     (<school>/students/<uuid>.jpg) instead of a full public URL —
--     existing rows are rewritten here. Paths are what the signing
--     helper needs, and they survive a project-URL change besides.
--
-- Write policies (0024: staff of the owning school only) are unchanged.

update storage.buckets set public = false where id = 'avatars';

drop policy if exists "avatars: public read" on storage.objects;
drop policy if exists "avatars: member read" on storage.objects;
create policy "avatars: member read" on storage.objects
  for select using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_school_id()::text
    and public.is_active_member()
  );

-- Stored public URLs become bare storage paths.
update public.students
set photo_url = regexp_replace(photo_url, '^.*/storage/v1/object/(public|sign)/avatars/', '')
where photo_url ~ '/storage/v1/object/(public|sign)/avatars/';

update public.teachers
set photo_url = regexp_replace(photo_url, '^.*/storage/v1/object/(public|sign)/avatars/', '')
where photo_url ~ '/storage/v1/object/(public|sign)/avatars/';
