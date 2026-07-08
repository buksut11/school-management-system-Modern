-- The avatars bucket accepted any file type/size — a user could upload an
-- SVG or HTML file (which can carry a <script>) and it would be served
-- back from a public URL. Restrict to actual raster image types and a
-- sane size cap, enforced by Storage itself (not just the client's
-- `accept="image/*"` hint, which is trivially bypassed).

update storage.buckets
set
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
