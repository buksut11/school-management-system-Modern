-- Homework / assignments (audit item: homework/assignments).
--
-- A homework noticeboard with per-student completion:
--   homework              one assignment for a class (optional subject),
--                         a due date and details.
--   homework_completions  one row per student who has ticked an
--                         assignment done (presence = done).
--
-- Mirrors the attendance/exams permission model (0023): office writes for
-- any class, a teacher writes for the classes they run; students/parents
-- read their own class's list and tick their own completions. Live
-- schedule, no year dimension (like the timetable).

-- ===================== homework =====================
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  class_id uuid not null,
  subject_id uuid,
  title text not null,
  details text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, school_id),
  constraint homework_class_fkey
    foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  constraint homework_subject_fkey
    foreign key (subject_id, school_id) references public.subjects (id, school_id)
    on delete set null (subject_id)
);

create index if not exists homework_class_idx on public.homework (class_id);
create index if not exists homework_school_idx on public.homework (school_id);
create index if not exists homework_due_idx on public.homework (due_date);

drop trigger if exists set_updated_at on public.homework;
create trigger set_updated_at before update on public.homework
  for each row execute function public.set_updated_at();

-- ===================== homework_completions =====================
create table if not exists public.homework_completions (
  homework_id uuid not null,
  student_id uuid not null,
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  completed_at timestamptz not null default now(),
  primary key (homework_id, student_id),
  constraint hc_homework_fkey
    foreign key (homework_id, school_id) references public.homework (id, school_id) on delete cascade,
  constraint hc_student_fkey
    foreign key (student_id, school_id) references public.students (id, school_id) on delete cascade
);

create index if not exists hc_student_idx on public.homework_completions (student_id);

-- ===================== RLS =====================
alter table public.homework enable row level security;
alter table public.homework_completions enable row level security;

-- homework: staff see everything; a student/parent sees their class's
-- board. Office writes any class; a teacher writes the classes they run.
drop policy if exists "homework: read" on public.homework;
create policy "homework: read" on public.homework for select
  using (school_id = public.current_school_id()
         and (public.is_school_staff()
              or class_id in (
                select s.class_id from public.students s
                where s.id in (select public.my_student_ids())
              )));

drop policy if exists "homework: write" on public.homework;
create policy "homework: write" on public.homework for insert
  with check (school_id = public.current_school_id()
              and (public.is_office()
                   or (public.current_member_role() = 'teacher'
                       and class_id in (select public.my_class_ids()))));

drop policy if exists "homework: update" on public.homework;
create policy "homework: update" on public.homework for update
  using (school_id = public.current_school_id()
         and (public.is_office()
              or (public.current_member_role() = 'teacher'
                  and class_id in (select public.my_class_ids()))))
  with check (school_id = public.current_school_id()
              and (public.is_office()
                   or (public.current_member_role() = 'teacher'
                       and class_id in (select public.my_class_ids()))));

drop policy if exists "homework: delete" on public.homework;
create policy "homework: delete" on public.homework for delete
  using (school_id = public.current_school_id()
         and (public.is_office()
              or (public.current_member_role() = 'teacher'
                  and class_id in (select public.my_class_ids()))));

-- completions: staff (and the class teacher) see who's done; a
-- student/parent ticks their own. Staff may also toggle on a learner's
-- behalf.
drop policy if exists "homework_completions: read" on public.homework_completions;
create policy "homework_completions: read" on public.homework_completions for select
  using (school_id = public.current_school_id()
         and (public.is_school_staff()
              or student_id in (select public.my_student_ids())));

drop policy if exists "homework_completions: write" on public.homework_completions;
create policy "homework_completions: write" on public.homework_completions for insert
  with check (school_id = public.current_school_id()
              and (public.is_school_staff()
                   or student_id in (select public.my_student_ids())));

drop policy if exists "homework_completions: delete" on public.homework_completions;
create policy "homework_completions: delete" on public.homework_completions for delete
  using (school_id = public.current_school_id()
         and (public.is_school_staff()
              or student_id in (select public.my_student_ids())));
