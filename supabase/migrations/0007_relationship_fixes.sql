-- Fixes three relational issues found in review:
--
-- 1. classes.teacher_id and teachers.class_id both modeled "which teacher
--    runs which class" from opposite directions with nothing keeping them
--    in sync — you could set a class's teacher on one screen and see a
--    different answer on the other. classes.teacher_id is now the single
--    source of truth; teachers.class_id is dropped and the app derives a
--    teacher's class by reverse lookup instead.
--
-- 2. attendance had no class_id, so it was always displayed/filtered via
--    the student's *current* class. A student moved to a new class would
--    silently rewrite which class their past attendance appears under.
--    attendance.class_id now snapshots the class at the time it was
--    recorded (existing rows are backfilled best-effort from the
--    student's current class, since the true historical value isn't
--    recoverable).
--
-- 3. activity_log recorded *what* happened but never *who* did it, which
--    defeats the point of an audit trail once more than one person has
--    access. Adds actor_id / actor_name.

alter table public.teachers drop column if exists class_id;

alter table public.attendance
  add column if not exists class_id uuid references public.classes (id) on delete set null;

update public.attendance a
set class_id = s.class_id
from public.students s
where a.student_id = s.id and a.class_id is null;

create index if not exists attendance_class_idx on public.attendance (class_id);

alter table public.activity_log
  add column if not exists actor_id uuid references auth.users (id) on delete set null,
  add column if not exists actor_name text;
