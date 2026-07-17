-- Relational gradebook (audit finding 1.2).
--
-- exams.subject_scores was a JSONB blob keyed by a subject list
-- HARD-CODED in the app (lib/constants.ts). The subjects table — the
-- thing the Subjects page edits — had no connection to it: adding a
-- subject never reached the gradebook, renaming one orphaned history,
-- and every school was stuck with the same seven columns.
--
-- exam_scores is now the source of truth: one row per exam per subject,
-- FK'd to the school's OWN subjects. What changes with it:
--
--   • save_exam() writes the exam and its scores in one transaction,
--     validates every score (0–100) and every subject (yours), and
--     computes total_score and grade IN the database — a crafted
--     request can no longer store grade 'A' with a total of 3.
--   • exams.subject_scores stays, demoted to a name-keyed snapshot that
--     save_exam maintains: report cards keep the names that were true
--     at recording time, and pre-0035 backups still restore.
--   • historical JSONB rows are backfilled into exam_scores by name
--     match; names the school's subject list lost along the way are
--     re-created so no score loses its subject.
--   • new schools get the default subject set seeded at creation
--     (create_school), the same way they get their first academic year
--     — an empty subjects list would mean an empty gradebook.
--
-- (teachers.subjects — the free-text array — is the remaining
-- denormalization; it's display-only and queued separately.)

-- ===================== parent keys (0029 pattern) =====================
do $$
declare
  t text;
begin
  foreach t in array array['exams', 'subjects'] loop
    if not exists (
      select 1 from pg_constraint
      where conname = t || '_id_school_key' and conrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I unique (id, school_id)',
        t, t || '_id_school_key');
    end if;
  end loop;
end;
$$;

-- ===================== exam_scores =====================
create table if not exists public.exam_scores (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  subject_id uuid not null,
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  score numeric(5, 1) not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default now(),
  unique (exam_id, subject_id),
  constraint exam_scores_exam_id_fkey
    foreign key (exam_id, school_id) references public.exams (id, school_id)
    on delete cascade,
  -- RESTRICT: a subject with recorded scores is history and can't be
  -- hard-deleted (the same posture fee history takes).
  constraint exam_scores_subject_id_fkey
    foreign key (subject_id, school_id) references public.subjects (id, school_id)
    on delete restrict
);

create index if not exists exam_scores_exam_idx on public.exam_scores (exam_id);
create index if not exists exam_scores_subject_idx on public.exam_scores (subject_id);
create index if not exists exam_scores_school_idx on public.exam_scores (school_id);

alter table public.exam_scores enable row level security;

-- Same read split as exams (staff school-wide, families their own);
-- writes and the replace-on-edit delete follow the exam they belong to:
-- office anywhere, teachers only on exams of classes they teach.
drop policy if exists "exam_scores: read" on public.exam_scores;
create policy "exam_scores: read" on public.exam_scores
  for select using (
    school_id = public.current_school_id()
    and (public.is_school_staff() or exam_id in (
      select e.id from public.exams e
      where e.student_id in (select public.my_student_ids())
    ))
  );
drop policy if exists "exam_scores: write" on public.exam_scores;
create policy "exam_scores: write" on public.exam_scores
  for insert with check (
    school_id = public.current_school_id()
    and (public.is_office()
         or (public.current_member_role() = 'teacher' and exam_id in (
           select e.id from public.exams e
           where e.class_id in (select public.my_class_ids())
         )))
  );
drop policy if exists "exam_scores: replace" on public.exam_scores;
create policy "exam_scores: replace" on public.exam_scores
  for delete using (
    school_id = public.current_school_id()
    and (public.is_office()
         or (public.current_member_role() = 'teacher' and exam_id in (
           select e.id from public.exams e
           where e.class_id in (select public.my_class_ids())
         )))
  );

-- ===================== grading in the database =====================
create or replace function public.exam_grade(p_total numeric, p_subject_count int)
returns text
language sql
immutable
as $$
  select case
    when pct >= 80 then 'A'
    when pct >= 70 then 'B'
    when pct >= 60 then 'C'
    when pct >= 50 then 'D'
    else 'F'
  end
  from (
    select coalesce(p_total, 0) / (100.0 * (greatest(coalesce(p_subject_count, 0), 0) + 1)) * 100 as pct
  ) x;
$$;

-- ===================== backfill history =====================
-- Re-create any subject a historical gradebook used but the school's
-- subject list no longer carries, then land every JSONB score as a row.
create or replace function public.backfill_exam_scores(p_school_id uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.subjects (school_id, name)
  select distinct e.school_id, kv.key
  from public.exams e
  cross join lateral jsonb_each(e.subject_scores) kv
  where e.school_id = p_school_id
    and jsonb_typeof(kv.value) = 'number'
    and not exists (
      select 1 from public.subjects s
      where s.school_id = e.school_id and lower(s.name) = lower(kv.key)
    );

  insert into public.exam_scores (exam_id, subject_id, school_id, score)
  select e.id, s.id, e.school_id,
         least(greatest((kv.value)::text::numeric, 0), 100)
  from public.exams e
  cross join lateral jsonb_each(e.subject_scores) kv
  join public.subjects s
    on s.school_id = e.school_id and lower(s.name) = lower(kv.key)
  where e.school_id = p_school_id
    and jsonb_typeof(kv.value) = 'number'
  on conflict (exam_id, subject_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select public.backfill_exam_scores(id) from public.schools;

-- ===================== save_exam: the one write path =====================
-- SECURITY INVOKER: exams/exam_scores RLS still applies, so office and
-- teacher writing rules are enforced inside exactly as for direct writes.
create or replace function public.save_exam(
  p_student_id uuid,
  p_term text,
  p_scores jsonb default '{}'::jsonb,   -- { subject_id: score }
  p_exam_id uuid default null,          -- null = create
  p_class_id uuid default null,
  p_year_id uuid default null,
  p_exam_date date default null,
  p_attendance_pct numeric default 100,
  p_test_score numeric default 0
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  v_student record;
  v_year_id uuid;
  v_exam_id uuid := p_exam_id;
  v_n int;
  v_total numeric;
  v_grade text;
  v_snapshot jsonb;
  v_bad text;
begin
  if v_school is null then
    raise exception 'You don''t belong to a school.';
  end if;
  if p_term not in ('Term 1', 'Term 2', 'Term 3') then
    raise exception 'Unknown term.';
  end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'Scores must map subject ids to numbers.';
  end if;
  if coalesce(p_test_score, 0) < 0 or coalesce(p_test_score, 0) > 100 then
    raise exception 'The test score must be between 0 and 100.';
  end if;

  select id, full_name into v_student from public.students where id = p_student_id;
  if not found then
    raise exception 'Student not found.';
  end if;

  select kv.key into v_bad
  from jsonb_each(p_scores) kv
  where jsonb_typeof(kv.value) <> 'number'
     or (kv.value)::text::numeric < 0
     or (kv.value)::text::numeric > 100
  limit 1;
  if v_bad is not null then
    raise exception 'Each subject score must be a number between 0 and 100.';
  end if;

  begin
    select kv.key into v_bad
    from jsonb_each(p_scores) kv
    where not exists (
      select 1 from public.subjects s
      where s.id = (kv.key)::uuid and s.school_id = v_school
    )
    limit 1;
  exception when invalid_text_representation then
    v_bad := '?';
  end;
  if v_bad is not null then
    raise exception 'One of those subjects isn''t in your school''s subject list.';
  end if;

  v_year_id := coalesce(p_year_id, public.current_academic_year_id());
  if v_year_id is null then
    raise exception 'No academic year is configured — add one in Settings first.';
  end if;

  select count(*), coalesce(sum((kv.value)::text::numeric), 0)
    into v_n, v_total
  from jsonb_each(p_scores) kv;
  v_total := v_total + coalesce(p_test_score, 0);
  v_grade := public.exam_grade(v_total, v_n);
  v_snapshot := coalesce((
    select jsonb_object_agg(s.name, kv.value)
    from jsonb_each(p_scores) kv
    join public.subjects s on s.id = (kv.key)::uuid
  ), '{}'::jsonb);

  if v_exam_id is null then
    begin
      insert into public.exams
        (student_id, class_id, year_id, term, exam_date, attendance_pct,
         test_score, subject_scores, total_score, grade)
      values
        (p_student_id, p_class_id, v_year_id, p_term,
         coalesce(p_exam_date, current_date), coalesce(p_attendance_pct, 100),
         coalesce(p_test_score, 0), v_snapshot, v_total, v_grade)
      returning id into v_exam_id;
    exception when unique_violation then
      raise exception '% already has a % record for that academic year.',
        v_student.full_name, p_term;
    end;
  else
    -- year_id intentionally stays: editing a record never moves it to a
    -- different academic year.
    update public.exams
    set class_id = p_class_id,
        term = p_term,
        exam_date = coalesce(p_exam_date, exam_date),
        attendance_pct = coalesce(p_attendance_pct, attendance_pct),
        test_score = coalesce(p_test_score, 0),
        subject_scores = v_snapshot,
        total_score = v_total,
        grade = v_grade
    where id = v_exam_id and student_id = p_student_id;
    if not found then
      raise exception 'Exam record not found (or you may not edit it).';
    end if;
    delete from public.exam_scores where exam_id = v_exam_id;
  end if;

  insert into public.exam_scores (exam_id, subject_id, school_id, score)
  select v_exam_id, (kv.key)::uuid, v_school, (kv.value)::text::numeric
  from jsonb_each(p_scores) kv;

  return jsonb_build_object(
    'exam_id', v_exam_id,
    'student_name', v_student.full_name,
    'total', v_total,
    'grade', v_grade
  );
end;
$$;

-- ===================== new schools start with a gradebook =====================
-- Same body as 0025's create_school, plus the default subject set.
create or replace function public.create_school(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_code text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can register a new school.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'School name is required.';
  end if;

  insert into public.schools (name) values (trim(p_name))
  returning id into v_school;

  insert into public.academic_years (school_id, name, starts_on, ends_on, is_current)
  select
    v_school,
    y.start_year || '-' || (y.start_year + 1),
    make_date(y.start_year, 8, 1),
    make_date(y.start_year + 1, 7, 31),
    true
  from (
    select case
      when extract(month from current_date) >= 8 then extract(year from current_date)::int
      else extract(year from current_date)::int - 1
    end as start_year
  ) y;

  insert into public.subjects (school_id, name, type, periods_per_week)
  values
    (v_school, 'Somali', 'core', 5),
    (v_school, 'English', 'core', 5),
    (v_school, 'Arabic', 'core', 4),
    (v_school, 'Chemistry', 'core', 4),
    (v_school, 'Physics', 'core', 4),
    (v_school, 'Maths', 'core', 6),
    (v_school, 'Geography', 'elective', 3);

  insert into public.invites (school_id, role, expires_at)
  values (v_school, 'admin', now() + interval '30 days')
  returning code into v_code;

  return jsonb_build_object('school_id', v_school, 'name', trim(p_name), 'invite_code', v_code);
end;
$$;

-- ===================== restore learns about exam_scores =====================
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
    'students', 'attendance', 'exams', 'exam_scores', 'fee_payments',
    'expenses', 'expense_payments', 'invoices', 'receipts', 'enrollments'
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
    'subjects', 'students', 'teachers', 'classes', 'departments'
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
    -- Pre-0035 snapshot: rebuild the relational scores from the
    -- name-keyed JSONB the way the migration itself did.
    v_counts := v_counts
      || jsonb_build_object('exam_scores', public.backfill_exam_scores(v_school));
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
