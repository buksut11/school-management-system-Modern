-- Teacher ↔ subject as a real relation (audit finding 1.2, remainder).
--
-- teachers.subjects was a free-text text[] with no connection to the
-- subjects table: "Maths" typed on the teacher form had nothing to do
-- with the Maths the gradebook and Subjects page know about, so you
-- couldn't ask "who teaches Chemistry?" and a renamed subject left every
-- teacher pointing at a dead string.
--
-- teacher_subjects is now the source of truth: one row per teacher per
-- subject, FK'd to the school's OWN subjects. teachers.subjects stays as
-- a name-keyed SNAPSHOT — kept honest by a trigger, never written by the
-- app — so the directory's list/search/CSV keep reading one array with
-- no join, exactly as before. (Same shape as the gradebook: exam_scores
-- is the truth, exams.subject_scores the snapshot.)

-- ===================== teacher_subjects =====================
create table if not exists public.teacher_subjects (
  teacher_id uuid not null,
  subject_id uuid not null,
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject_id),
  -- same-school references, structurally (0029 pattern)
  constraint teacher_subjects_teacher_id_fkey
    foreign key (teacher_id, school_id) references public.teachers (id, school_id)
    on delete cascade,
  constraint teacher_subjects_subject_id_fkey
    foreign key (subject_id, school_id) references public.subjects (id, school_id)
    on delete cascade
);

create index if not exists teacher_subjects_subject_idx on public.teacher_subjects (subject_id);
create index if not exists teacher_subjects_school_idx on public.teacher_subjects (school_id);

alter table public.teacher_subjects enable row level security;

-- Reads follow teachers (staff-wide; contact-free family portals never
-- see the staff directory anyway). Office maintains the links, admin
-- deletes — same posture teachers itself takes (0023).
drop policy if exists "teacher_subjects: read" on public.teacher_subjects;
create policy "teacher_subjects: read" on public.teacher_subjects
  for select using (school_id = public.current_school_id() and public.is_school_staff());
drop policy if exists "teacher_subjects: office insert" on public.teacher_subjects;
create policy "teacher_subjects: office insert" on public.teacher_subjects
  for insert with check (school_id = public.current_school_id() and public.is_office());
drop policy if exists "teacher_subjects: office delete" on public.teacher_subjects;
create policy "teacher_subjects: office delete" on public.teacher_subjects
  for delete using (school_id = public.current_school_id() and public.is_office());

-- ===================== snapshot maintenance =====================
-- Recompute teachers.subjects[] from the links whenever they change —
-- including a subject deletion cascading in, which would otherwise leave
-- the snapshot naming a subject that no longer exists.
create or replace function public.refresh_teacher_subject_names()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_teacher uuid := coalesce(new.teacher_id, old.teacher_id);
begin
  update public.teachers t
  set subjects = coalesce((
    select array_agg(s.name order by s.seq)
    from public.teacher_subjects ts
    join public.subjects s on s.id = ts.subject_id
    where ts.teacher_id = v_teacher
  ), '{}')
  where t.id = v_teacher;
  return null;
end;
$$;

drop trigger if exists refresh_teacher_subject_names on public.teacher_subjects;
create trigger refresh_teacher_subject_names
  after insert or delete on public.teacher_subjects
  for each row execute function public.refresh_teacher_subject_names();

-- ===================== replace-in-one-call RPC =====================
-- SECURITY INVOKER: teacher_subjects RLS still applies, so office-only
-- writes are enforced inside; the explicit checks just give clear errors.
create or replace function public.set_teacher_subjects(
  p_teacher_id uuid,
  p_subject_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
begin
  if not public.is_office() then
    raise exception 'Only office staff can change a teacher''s subjects.';
  end if;
  if not exists (
    select 1 from public.teachers where id = p_teacher_id and school_id = v_school
  ) then
    raise exception 'That teacher isn''t in your school.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_subject_ids, '{}')) sid
    where not exists (
      select 1 from public.subjects s where s.id = sid and s.school_id = v_school
    )
  ) then
    raise exception 'One of those subjects isn''t in your school''s subject list.';
  end if;

  delete from public.teacher_subjects where teacher_id = p_teacher_id;
  insert into public.teacher_subjects (teacher_id, subject_id, school_id)
  select p_teacher_id, sid, v_school
  from unnest(coalesce(p_subject_ids, '{}')) sid
  on conflict do nothing;
  -- the trigger refreshes teachers.subjects[] on every insert/delete above
end;
$$;

-- ===================== backfill =====================
-- Link each teacher to the subjects their free-text array named. Names
-- the subject list doesn't carry are created first (0035 pattern), so
-- no assignment is silently dropped; the trigger then rewrites each
-- snapshot to the canonical subject names.
create or replace function public.backfill_teacher_subjects(p_school_id uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.subjects (school_id, name)
  select distinct t.school_id, trim(name.value)
  from public.teachers t
  cross join lateral unnest(t.subjects) as name(value)
  where t.school_id = p_school_id
    and trim(name.value) <> ''
    and not exists (
      select 1 from public.subjects s
      where s.school_id = t.school_id and lower(s.name) = lower(trim(name.value))
    );

  insert into public.teacher_subjects (teacher_id, subject_id, school_id)
  select distinct t.id, s.id, t.school_id
  from public.teachers t
  cross join lateral unnest(t.subjects) as name(value)
  join public.subjects s
    on s.school_id = t.school_id and lower(s.name) = lower(trim(name.value))
  where t.school_id = p_school_id
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select public.backfill_teacher_subjects(id) from public.schools;

-- ===================== restore learns about teacher_subjects =====================
create or replace function public.restore_insert_rows(
  p_table text,
  p_rows jsonb,
  p_exclude text[] default '{}'
)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_cols text;
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can restore from backup.';
  end if;
  if p_table <> all (array[
    'academic_years', 'departments', 'classes', 'teachers', 'subjects',
    'teacher_subjects', 'students', 'attendance', 'exams', 'exam_scores',
    'fee_payments', 'expenses', 'expense_payments', 'invoices', 'receipts',
    'enrollments'
  ]) then
    raise exception 'Table % cannot be restored.', p_table;
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  select string_agg(quote_ident(c.column_name), ', ')
  into v_cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = p_table
    and c.column_name in (select jsonb_object_keys(p_rows -> 0))
    and c.column_name <> all (array['seq', 'school_id'] || p_exclude);

  if v_cols is null then
    raise exception 'Snapshot rows for % carry no recognizable columns.', p_table;
  end if;

  execute format(
    'insert into public.%I (%s, school_id)
     select %s, public.current_school_id()
     from jsonb_populate_recordset(null::public.%I, $1)',
    p_table, v_cols, v_cols, p_table
  ) using p_rows;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.restore_school_snapshot(
  p_data jsonb,
  p_school_id uuid default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  t text;
  v_school uuid;
  v_counts jsonb := '{}'::jsonb;
  v_years jsonb := coalesce(p_data -> 'academic_years', '[]'::jsonb);
  v_classes jsonb := coalesce(p_data -> 'classes', '[]'::jsonb);
  v_enrollments jsonb := coalesce(p_data -> 'enrollments', '[]'::jsonb);
  v_expense_payments jsonb := coalesce(p_data -> 'expense_payments', '[]'::jsonb);
  v_exam_scores jsonb := coalesce(p_data -> 'exam_scores', '[]'::jsonb);
  v_teacher_subjects jsonb := coalesce(p_data -> 'teacher_subjects', '[]'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can restore from backup.';
  end if;
  v_school := public.current_school_id();
  if v_school is null then
    raise exception 'You don''t belong to a school.';
  end if;
  if p_school_id is not null and p_school_id <> v_school then
    raise exception 'This backup belongs to a different school and can''t be restored here.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'This file doesn''t contain restorable data.';
  end if;

  foreach t in array array[
    'receipts', 'invoices', 'exam_scores', 'attendance', 'exams',
    'fee_payments', 'expense_payments', 'expenses', 'enrollments',
    'teacher_subjects', 'subjects', 'students', 'teachers', 'classes',
    'departments'
  ] loop
    execute format('delete from public.%I where school_id = $1', t) using v_school;
  end loop;

  if jsonb_array_length(v_years) > 0 then
    delete from public.academic_years where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('academic_years', public.restore_insert_rows('academic_years', v_years));
  end if;

  v_counts := v_counts
    || jsonb_build_object('departments', public.restore_insert_rows('departments', p_data -> 'departments'));

  v_counts := v_counts
    || jsonb_build_object('classes', public.restore_insert_rows('classes', v_classes, array['teacher_id']));
  v_counts := v_counts
    || jsonb_build_object('teachers', public.restore_insert_rows('teachers', p_data -> 'teachers'));
  update public.classes c
  set teacher_id = x.teacher_id
  from jsonb_to_recordset(v_classes) as x(id uuid, teacher_id uuid)
  where c.id = x.id and c.school_id = v_school and x.teacher_id is not null;

  v_counts := v_counts
    || jsonb_build_object('subjects', public.restore_insert_rows('subjects', p_data -> 'subjects'))
    || jsonb_build_object('students', public.restore_insert_rows('students', p_data -> 'students'))
    || jsonb_build_object('attendance', public.restore_insert_rows('attendance', p_data -> 'attendance'))
    || jsonb_build_object('exams', public.restore_insert_rows('exams', p_data -> 'exams'));

  if jsonb_array_length(v_exam_scores) > 0 then
    v_counts := v_counts
      || jsonb_build_object('exam_scores', public.restore_insert_rows('exam_scores', v_exam_scores));
  else
    v_counts := v_counts
      || jsonb_build_object('exam_scores', public.backfill_exam_scores(v_school));
  end if;

  -- teacher_subjects: the snapshot's own rows if present, else rebuilt
  -- from each restored teacher's name array (pre-0036 backups). Either
  -- path fires the snapshot trigger, which re-canonicalizes the names.
  if jsonb_array_length(v_teacher_subjects) > 0 then
    v_counts := v_counts
      || jsonb_build_object('teacher_subjects', public.restore_insert_rows('teacher_subjects', v_teacher_subjects));
  else
    v_counts := v_counts
      || jsonb_build_object('teacher_subjects', public.backfill_teacher_subjects(v_school));
  end if;

  v_counts := v_counts
    || jsonb_build_object('fee_payments', public.restore_insert_rows('fee_payments', p_data -> 'fee_payments'))
    || jsonb_build_object('expenses', public.restore_insert_rows('expenses', p_data -> 'expenses'));

  if jsonb_array_length(v_expense_payments) > 0 then
    v_counts := v_counts
      || jsonb_build_object('expense_payments', public.restore_insert_rows('expense_payments', v_expense_payments));
  else
    insert into public.expense_payments (expense_id, school_id, amount, method, note, paid_at)
    select e.id, e.school_id, e.paid, e.method,
           'Opening balance (restored from a backup without payment history)', e.date::timestamptz
    from public.expenses e
    where e.school_id = v_school and e.paid > 0;
  end if;

  v_counts := v_counts
    || jsonb_build_object('invoices', public.restore_insert_rows('invoices', p_data -> 'invoices'))
    || jsonb_build_object('receipts', public.restore_insert_rows('receipts', p_data -> 'receipts'));

  if jsonb_array_length(v_enrollments) > 0 then
    delete from public.enrollments where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('enrollments', public.restore_insert_rows('enrollments', v_enrollments));
  end if;

  return v_counts;
end;
$$;
