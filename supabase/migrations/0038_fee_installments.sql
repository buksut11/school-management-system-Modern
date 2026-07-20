-- Fee structures, part 2: installment schedules (audit item 11).
--
-- 0037 gave each student a per-year fee plan; this adds WHEN that fee
-- is expected. fee_installments is the school's payment schedule for an
-- academic year — e.g. Term 1 · 40% · due Sep 1, Term 2 · 30% · due
-- Jan 10, Term 3 · 30% · due Apr 1. Each installment is a percentage of
-- every student's own NET fee, so one schedule serves every class and
-- discount level.
--
-- The balances view derives from it, per student:
--
--   expected       what should have been paid by today
--                  (net fee × the percents already past due)
--   overdue        expected minus paid, floored at zero — the number
--                  the office chases and future fee reminders will use
--   next_due_*     the next upcoming installment, for display
--
-- Schools without a schedule keep exactly today's behavior: nothing is
-- ever marked overdue. Payments themselves stay uncapped by the
-- schedule — paying the year up front is always allowed.

-- ===================== fee_installments =====================
create table if not exists public.fee_installments (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null,
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  name text not null,
  due_date date not null,
  percent numeric(5, 2) not null check (percent > 0 and percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year_id, name),
  -- same-school reference, structurally (0029 pattern); the schedule
  -- dies with its year.
  constraint fee_installments_year_id_fkey
    foreign key (year_id, school_id) references public.academic_years (id, school_id)
    on delete cascade
);

create index if not exists fee_installments_year_idx on public.fee_installments (year_id);
create index if not exists fee_installments_school_idx on public.fee_installments (school_id);

drop trigger if exists set_updated_at on public.fee_installments;
create trigger set_updated_at before update on public.fee_installments
  for each row execute function public.set_updated_at();

alter table public.fee_installments enable row level security;

-- Every assigned member may read (family portals show due dates);
-- finance/admin manage the schedule.
drop policy if exists "fee_installments: member read" on public.fee_installments;
create policy "fee_installments: member read" on public.fee_installments
  for select using (school_id = public.current_school_id() and public.is_active_member());
drop policy if exists "fee_installments: finance insert" on public.fee_installments;
create policy "fee_installments: finance insert" on public.fee_installments
  for insert with check (school_id = public.current_school_id() and public.is_finance());
drop policy if exists "fee_installments: finance update" on public.fee_installments;
create policy "fee_installments: finance update" on public.fee_installments
  for update using (school_id = public.current_school_id() and public.is_finance())
  with check (school_id = public.current_school_id() and public.is_finance());
drop policy if exists "fee_installments: finance delete" on public.fee_installments;
create policy "fee_installments: finance delete" on public.fee_installments
  for delete using (school_id = public.current_school_id() and public.is_finance());

-- A year's percents may never exceed 100 — checked per row so even
-- direct writes outside set_fee_installments() can't oversubscribe.
create or replace function public.check_installment_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(percent), 0) into v_total
  from public.fee_installments
  where year_id = new.year_id;
  if v_total > 100 then
    raise exception 'The year''s installments add up to %%% — they can''t exceed 100%%.',
      trim(to_char(v_total, 'FM999990.##'));
  end if;
  return null;
end;
$$;

drop trigger if exists check_installment_total on public.fee_installments;
create trigger check_installment_total
  after insert or update on public.fee_installments
  for each row execute function public.check_installment_total();

-- ===================== replace-the-schedule RPC =====================
-- SECURITY INVOKER: the finance-only policies above govern the writes;
-- the explicit checks exist for clear error messages. Items:
--   [{ "name": "Term 1", "due_date": "2026-09-01", "percent": 40 }, …]
create or replace function public.set_fee_installments(
  p_year_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  it jsonb;
  v_name text;
  v_due date;
  v_pct numeric;
  v_total numeric := 0;
  v_count int := 0;
begin
  if not public.is_finance() then
    raise exception 'Only a finance or admin account can change the payment schedule.';
  end if;
  if not exists (
    select 1 from public.academic_years where id = p_year_id and school_id = v_school
  ) then
    raise exception 'That academic year isn''t in your school.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Installments must be a list.';
  end if;

  delete from public.fee_installments where year_id = p_year_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_name := nullif(trim(coalesce(it ->> 'name', '')), '');
    if v_name is null then
      raise exception 'Every installment needs a name (e.g. "Term 1").';
    end if;
    begin
      v_due := (it ->> 'due_date')::date;
    exception when others then
      v_due := null;
    end;
    if v_due is null then
      raise exception 'Installment "%" needs a valid due date.', v_name;
    end if;
    v_pct := (it ->> 'percent')::numeric;
    if v_pct is null or v_pct <= 0 or v_pct > 100 then
      raise exception 'Installment "%" needs a percent between 0 and 100.', v_name;
    end if;
    v_total := v_total + v_pct;

    insert into public.fee_installments (year_id, school_id, name, due_date, percent)
    values (p_year_id, v_school, v_name, v_due, v_pct);
    v_count := v_count + 1;
  end loop;

  if v_total > 100 then
    raise exception 'The installments add up to %%% — they can''t exceed 100%%.',
      trim(to_char(v_total, 'FM999990.##'));
  end if;

  return jsonb_build_object('count', v_count, 'total_percent', v_total);
end;
$$;

-- ===================== balances view: schedule-aware =====================
-- Dropped and recreated (not replaced) because four columns are added:
-- expected, overdue, next_due_date, next_due_label. Existing columns
-- keep their exact order and meaning.
drop view if exists public.student_fee_balances;
create view public.student_fee_balances
with (security_invoker = true)
as
select
  s.id as student_id,
  s.full_name,
  s.photo_url,
  s.class_id,
  c.name as class_name,
  s.status as student_status,
  coalesce(sf.amount - sf.discount, s.base_fees) as due,
  coalesce(p.paid, 0) as paid,
  greatest(coalesce(sf.amount - sf.discount, s.base_fees) - coalesce(p.paid, 0), 0) as balance,
  case
    when coalesce(sf.amount - sf.discount, s.base_fees) - coalesce(p.paid, 0) <= 0 then 'paid'
    when coalesce(p.paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as fee_status,
  coalesce(sf.amount, s.base_fees) as gross,
  coalesce(sf.discount, 0) as discount,
  sf.discount_reason,
  round(
    coalesce(sf.amount - sf.discount, s.base_fees)
    * least(coalesce(sched.pct_due, 0), 100) / 100, 2
  ) as expected,
  greatest(
    round(
      coalesce(sf.amount - sf.discount, s.base_fees)
      * least(coalesce(sched.pct_due, 0), 100) / 100, 2
    ) - coalesce(p.paid, 0), 0
  ) as overdue,
  sched.next_due_date,
  sched.next_due_label
from public.students s
left join public.classes c on c.id = s.class_id
left join lateral (
  select ay.id from public.academic_years ay
  where ay.school_id = s.school_id
  order by ay.is_current desc, ay.starts_on desc nulls last, ay.created_at desc
  limit 1
) yr on true
left join public.student_fees sf on sf.student_id = s.id and sf.year_id = yr.id
left join lateral (
  select sum(fp.amount) as paid
  from public.fee_payments fp
  where fp.student_id = s.id and fp.year_id = yr.id
) p on true
left join lateral (
  select
    sum(fi.percent) filter (where fi.due_date <= current_date) as pct_due,
    min(fi.due_date) filter (where fi.due_date > current_date) as next_due_date,
    (array_agg(fi.name order by fi.due_date) filter (where fi.due_date > current_date))[1] as next_due_label
  from public.fee_installments fi
  where fi.year_id = yr.id
) sched on true;

grant select on public.student_fee_balances to authenticated;

-- ===================== restore learns about fee_installments =====================
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
    'teachers', 'subjects', 'teacher_subjects', 'students', 'student_fees',
    'attendance', 'exams', 'exam_scores', 'fee_payments', 'expenses',
    'expense_payments', 'invoices', 'receipts', 'enrollments'
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
    'student_fees', 'teacher_subjects', 'subjects', 'students', 'teachers',
    'classes', 'departments'
  ] loop
    execute format('delete from public.%I where school_id = $1', t) using v_school;
  end loop;

  if jsonb_array_length(v_years) > 0 then
    -- installments cascade with their years; snapshot ones re-land below
    delete from public.academic_years where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('academic_years', public.restore_insert_rows('academic_years', v_years));
  end if;

  -- The schedule is only replaced when the snapshot carries one —
  -- pre-0038 files leave whatever schedule the surviving years have.
  if jsonb_array_length(v_fee_installments) > 0 then
    delete from public.fee_installments where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('fee_installments', public.restore_insert_rows('fee_installments', v_fee_installments));
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
