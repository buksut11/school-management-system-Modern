-- Per-school unique subject names (audit finding 1.4).
--
-- 0019 made classes, departments and academic_years unique per school
-- but missed subjects — nothing stopped two "Maths" rows in the same
-- school. Existing duplicates are merged down to the oldest row first
-- (nothing references subjects, so dropping the newer copies is safe).

delete from public.subjects s
using public.subjects keep
where keep.school_id = s.school_id
  and lower(keep.name) = lower(s.name)
  and keep.seq < s.seq;

-- An expression index rather than a constraint so "Maths" and "maths"
-- also collide — the dedupe above matched case-insensitively too.
create unique index if not exists subjects_school_name_key
  on public.subjects (school_id, lower(name));
