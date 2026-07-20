-- Timetable (audit item 11): period slots + a weekly lesson grid.
--
-- Nothing in the schema said WHEN anything happens — classes had no
-- schedule at all. Two tables fix that:
--
--   timetable_slots  the school's daily period structure ("Period 1",
--                    07:30–08:15, …) — one set per school, shared by
--                    every class.
--   lessons          one cell of the weekly grid: class × day × slot →
--                    subject (+ optionally the teacher taking it).
--
-- Integrity lives in the database, not the UI:
--
--   • a class can hold ONE lesson per slot per day (primary unique);
--   • a TEACHER can only be in one place at a time — a partial unique
--     index rejects double-booking across classes, and save_lesson()
--     translates the violation into "already teaching Form 2A then";
--   • day is 0=Monday … 6=Sunday; which days a school actually uses is
--     a UI concern (the default grid shows the Sat–Thu week common in
--     Somalia), the schema supports all seven.
--
-- The timetable is the LIVE schedule (like classes themselves, it has
-- no year dimension — history wasn't asked of it).
--
-- RLS: every assigned member reads (students and parents see their
-- class's week, teachers their own); office (admin/staff) edits.

-- ===================== timetable_slots =====================
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  name text not null,
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name),
  unique (id, school_id),
  check (ends_at > starts_at)
);

create index if not exists timetable_slots_school_idx on public.timetable_slots (school_id);

drop trigger if exists set_updated_at on public.timetable_slots;
create trigger set_updated_at before update on public.timetable_slots
  for each row execute function public.set_updated_at();

-- ===================== lessons =====================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  class_id uuid not null,
  slot_id uuid not null,
  day smallint not null check (day between 0 and 6),
  subject_id uuid not null,
  teacher_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, day, slot_id),
  -- same-school references, structurally (0029 pattern)
  constraint lessons_class_id_fkey
    foreign key (class_id, school_id) references public.classes (id, school_id)
    on delete cascade,
  constraint lessons_slot_id_fkey
    foreign key (slot_id, school_id) references public.timetable_slots (id, school_id)
    on delete cascade,
  constraint lessons_subject_id_fkey
    foreign key (subject_id, school_id) references public.subjects (id, school_id)
    on delete cascade,
  constraint lessons_teacher_id_fkey
    foreign key (teacher_id, school_id) references public.teachers (id, school_id)
    on delete set null (teacher_id)
);

-- a teacher can't be in two classrooms at once (slot ids are per-school,
-- so this can never collide across tenants)
create unique index if not exists lessons_teacher_clash_idx
  on public.lessons (teacher_id, day, slot_id) where teacher_id is not null;

create index if not exists lessons_class_idx on public.lessons (class_id);
create index if not exists lessons_school_idx on public.lessons (school_id);

drop trigger if exists set_updated_at on public.lessons;
create trigger set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

-- ===================== RLS =====================
alter table public.timetable_slots enable row level security;
alter table public.lessons enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['timetable_slots', 'lessons'] loop
    execute format('drop policy if exists "%s: member read" on public.%I', t, t);
    execute format('create policy "%s: member read" on public.%I for select
      using (school_id = public.current_school_id() and public.is_active_member())', t, t);
    execute format('drop policy if exists "%s: office insert" on public.%I', t, t);
    execute format('create policy "%s: office insert" on public.%I for insert
      with check (school_id = public.current_school_id() and public.is_office())', t, t);
    execute format('drop policy if exists "%s: office update" on public.%I', t, t);
    execute format('create policy "%s: office update" on public.%I for update
      using (school_id = public.current_school_id() and public.is_office())
      with check (school_id = public.current_school_id() and public.is_office())', t, t);
    -- deleting a lesson or slot is routine timetable editing, not
    -- destructive history — office, not admin-only
    execute format('drop policy if exists "%s: office delete" on public.%I', t, t);
    execute format('create policy "%s: office delete" on public.%I for delete
      using (school_id = public.current_school_id() and public.is_office())', t, t);
  end loop;
end;
$$;

-- ===================== set_timetable_slots: edit the period grid =====================
-- Replaces the school's slot list intelligently: items WITH an id update
-- that slot in place (its lessons survive), items without insert, and
-- slots missing from the list are removed (their lessons cascade — the
-- UI warns). SECURITY INVOKER: office RLS governs every write.
create or replace function public.set_timetable_slots(p_items jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  it jsonb;
  v_id uuid;
  v_name text;
  v_start time;
  v_end time;
  v_keep uuid[] := '{}';
  v_count int := 0;
begin
  if not public.is_office() then
    raise exception 'Only office staff can change the period grid.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Periods must be a list.';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_name := nullif(trim(coalesce(it ->> 'name', '')), '');
    if v_name is null then
      raise exception 'Every period needs a name (e.g. "Period 1").';
    end if;
    begin
      v_start := (it ->> 'starts_at')::time;
      v_end := (it ->> 'ends_at')::time;
    exception when others then
      v_start := null;
    end;
    if v_start is null or v_end is null or v_end <= v_start then
      raise exception 'Period "%" needs a valid start and end time.', v_name;
    end if;

    v_id := nullif(it ->> 'id', '')::uuid;
    if v_id is not null and exists (
      select 1 from public.timetable_slots where id = v_id and school_id = v_school
    ) then
      update public.timetable_slots
      set name = v_name, starts_at = v_start, ends_at = v_end
      where id = v_id;
    else
      insert into public.timetable_slots (school_id, name, starts_at, ends_at)
      values (v_school, v_name, v_start, v_end)
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_count := v_count + 1;
  end loop;

  delete from public.timetable_slots
  where school_id = v_school and id <> all (v_keep);

  return jsonb_build_object('count', v_count);
end;
$$;

-- ===================== save_lesson: one cell of the grid =====================
-- Upserts the class's lesson for that day+slot; a teacher double-booking
-- comes back as a readable message naming the clashing class instead of
-- a raw unique-violation. SECURITY INVOKER: office RLS governs writes.
create or replace function public.save_lesson(
  p_class_id uuid,
  p_day int,
  p_slot_id uuid,
  p_subject_id uuid,
  p_teacher_id uuid default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  v_clash record;
begin
  if not public.is_office() then
    raise exception 'Only office staff can edit the timetable.';
  end if;
  if p_day is null or p_day < 0 or p_day > 6 then
    raise exception 'Unknown day.';
  end if;
  if not exists (
    select 1 from public.classes where id = p_class_id and school_id = v_school
  ) then
    raise exception 'That class isn''t in your school.';
  end if;
  if not exists (
    select 1 from public.timetable_slots where id = p_slot_id and school_id = v_school
  ) then
    raise exception 'That period isn''t in your school''s grid.';
  end if;

  begin
    insert into public.lessons (school_id, class_id, day, slot_id, subject_id, teacher_id)
    values (v_school, p_class_id, p_day, p_slot_id, p_subject_id, p_teacher_id)
    on conflict (class_id, day, slot_id) do update
      set subject_id = excluded.subject_id,
          teacher_id = excluded.teacher_id;
  exception when unique_violation then
    -- the only other unique is the teacher-clash index
    select t.full_name, c.name as class_name into v_clash
    from public.lessons l
    join public.teachers t on t.id = l.teacher_id
    join public.classes c on c.id = l.class_id
    where l.teacher_id = p_teacher_id and l.day = p_day and l.slot_id = p_slot_id;
    raise exception '% is already teaching % at that time.',
      coalesce(v_clash.full_name, 'That teacher'), coalesce(v_clash.class_name, 'another class');
  end;

  return jsonb_build_object('saved', true);
end;
$$;

-- ===================== restore learns about the timetable =====================
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
    'academic_years', 'fee_installments', 'departments', 'classes',
    'teachers', 'subjects', 'teacher_subjects', 'timetable_slots',
    'lessons', 'students', 'student_fees', 'attendance', 'exams',
    'exam_scores', 'fee_payments', 'expenses', 'expense_payments',
    'invoices', 'receipts', 'enrollments'
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
  v_student_fees jsonb := coalesce(p_data -> 'student_fees', '[]'::jsonb);
  v_fee_installments jsonb := coalesce(p_data -> 'fee_installments', '[]'::jsonb);
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
    'student_fees', 'lessons', 'timetable_slots', 'teacher_subjects',
    'subjects', 'students', 'teachers', 'classes', 'departments'
  ] loop
    execute format('delete from public.%I where school_id = $1', t) using v_school;
  end loop;

  if jsonb_array_length(v_years) > 0 then
    delete from public.academic_years where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('academic_years', public.restore_insert_rows('academic_years', v_years));
  end if;

  if jsonb_array_length(v_fee_installments) > 0 then
    delete from public.fee_installments where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('fee_installments', public.restore_insert_rows('fee_installments', v_fee_installments));
  end if;

  v_counts := v_counts
    || jsonb_build_object('departments', public.restore_insert_rows('departments', p_data -> 'departments'))
    || jsonb_build_object('timetable_slots', public.restore_insert_rows('timetable_slots', p_data -> 'timetable_slots'));

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
    || jsonb_build_object('lessons', public.restore_insert_rows('lessons', p_data -> 'lessons'))
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

  if jsonb_array_length(v_student_fees) > 0 then
    delete from public.student_fees where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('student_fees', public.restore_insert_rows('student_fees', v_student_fees));
  else
    v_counts := v_counts
      || jsonb_build_object('student_fees', public.backfill_student_fees(v_school));
  end if;

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
