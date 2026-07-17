-- Fee structures, part 1: per-year fees + discounts (audit item 11).
--
-- students.base_fees was the whole fee model: one flat number per
-- student, no history ("what was Ayaan's fee in 2025-26?" became
-- unanswerable the moment it was edited) and no way to give a
-- scholarship or sibling discount without silently rewriting the fee.
--
-- student_fees is the fee plan: one row per student per academic year —
--
--   amount            the gross annual fee for that year
--   discount, reason  scholarship / sibling / staff-child reduction
--   net due           amount - discount (what balances run against)
--
-- maintained the way enrollments are:
--
--   • a trigger snapshots students.base_fees into the current year's
--     row whenever a student is created or their fee changed — the
--     column stays as the fast "default fee" pointer and the student
--     form keeps working unchanged; a custom year amount or discount
--     set by finance is never clobbered by unrelated student edits;
--   • switching the academic year seeds every active student's new-year
--     row from base_fees, so fees roll over like enrollments do;
--   • set_student_fee() is the finance-only write path for adjusting a
--     year's amount/discount;
--   • record_fee_payment() and the balances view now compute "due"
--     from the year's net fee, falling back to base_fees where no row
--     exists (mid-migration safety);
--   • existing data is backfilled: current-year rows for every student,
--     plus rows for any past year that has payments (best-effort at
--     base_fees, the 0014 approach).
--
-- (Installment schedules with due dates are the next slice of this
-- feature; the per-year plan row created here is what they attach to.)

-- ===================== student_fees =====================
create table if not exists public.student_fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  year_id uuid not null,
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  amount numeric(10, 2) not null check (amount >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  discount_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, year_id),
  check (discount <= amount),
  -- same-school references, structurally (0029 pattern)
  constraint student_fees_student_id_fkey
    foreign key (student_id, school_id) references public.students (id, school_id)
    on delete cascade,
  constraint student_fees_year_id_fkey
    foreign key (year_id, school_id) references public.academic_years (id, school_id)
    on delete restrict
);

create index if not exists student_fees_year_idx on public.student_fees (year_id);
create index if not exists student_fees_school_idx on public.student_fees (school_id);

drop trigger if exists set_updated_at on public.student_fees;
create trigger set_updated_at before update on public.student_fees
  for each row execute function public.set_updated_at();

alter table public.student_fees enable row level security;

-- Money posture: the fees desk (admin/finance/staff) reads, families see
-- their own children's plan (the balances view resolves through this),
-- and only finance/admin write. Day-to-day rows are created by the
-- SECURITY DEFINER sync trigger below, so office staff creating a
-- student never need direct write access.
drop policy if exists "student_fees: read" on public.student_fees;
create policy "student_fees: read" on public.student_fees
  for select using (
    school_id = public.current_school_id()
    and (public.sees_money() or student_id in (select public.my_student_ids()))
  );
drop policy if exists "student_fees: finance insert" on public.student_fees;
create policy "student_fees: finance insert" on public.student_fees
  for insert with check (school_id = public.current_school_id() and public.is_finance());
drop policy if exists "student_fees: finance update" on public.student_fees;
create policy "student_fees: finance update" on public.student_fees
  for update using (school_id = public.current_school_id() and public.is_finance())
  with check (school_id = public.current_school_id() and public.is_finance());
drop policy if exists "student_fees: finance delete" on public.student_fees;
create policy "student_fees: finance delete" on public.student_fees
  for delete using (school_id = public.current_school_id() and public.is_finance());

-- ===================== sync from students.base_fees =====================
-- SECURITY DEFINER: office staff may create/edit students but only
-- finance writes student_fees — the trigger is the sanctioned bridge.
-- It only touches the row for the student being written, and only when
-- base_fees actually changed, so a finance-set custom amount survives
-- every unrelated student edit.
create or replace function public.sync_student_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year uuid;
begin
  if tg_op = 'UPDATE' and new.base_fees is not distinct from old.base_fees then
    return new;
  end if;
  select id into v_year from public.academic_years
  where school_id = new.school_id
  order by is_current desc, starts_on desc nulls last, created_at desc
  limit 1;
  if v_year is null then
    return new;
  end if;
  insert into public.student_fees (student_id, year_id, school_id, amount)
  values (new.id, v_year, new.school_id, new.base_fees)
  on conflict (student_id, year_id) do update
    set amount = excluded.amount,
        -- keep the check (discount <= amount) satisfiable
        discount = least(public.student_fees.discount, excluded.amount);
  return new;
end;
$$;

drop trigger if exists sync_student_fee on public.students;
create trigger sync_student_fee
  after insert or update of base_fees on public.students
  for each row execute function public.sync_student_fee();

-- ===================== backfill =====================
create or replace function public.backfill_student_fees(p_school_id uuid)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_count int;
begin
  -- every student gets a plan row for the school's current year
  insert into public.student_fees (student_id, year_id, school_id, amount)
  select s.id, y.id, s.school_id, s.base_fees
  from public.students s
  join lateral (
    select ay.id from public.academic_years ay
    where ay.school_id = s.school_id
    order by ay.is_current desc, ay.starts_on desc nulls last, ay.created_at desc
    limit 1
  ) y on true
  where s.school_id = p_school_id
  on conflict (student_id, year_id) do nothing;

  -- past years that saw payments get a best-effort row at today's
  -- base_fees (their true historical amount was never stored — 0014)
  insert into public.student_fees (student_id, year_id, school_id, amount)
  select distinct fp.student_id, fp.year_id, fp.school_id, s.base_fees
  from public.fee_payments fp
  join public.students s on s.id = fp.student_id
  where fp.school_id = p_school_id
  on conflict (student_id, year_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

select public.backfill_student_fees(id) from public.schools;

-- ===================== set_student_fee: the adjust path =====================
-- SECURITY DEFINER: finance holds money authority but not student-row
-- update rights, and adjusting the CURRENT year also refreshes
-- students.base_fees (the default the next year inherits) so the
-- student form and the fees page never disagree. Every input is
-- validated against the caller's own school first.
create or replace function public.set_student_fee(
  p_student_id uuid,
  p_amount numeric,
  p_discount numeric default 0,
  p_discount_reason text default null,
  p_year_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid := public.current_school_id();
  v_student record;
  v_year_id uuid;
  v_current uuid;
begin
  if not public.is_finance() then
    raise exception 'Only a finance or admin account can adjust fees.';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'The annual fee can''t be negative.';
  end if;
  if coalesce(p_discount, 0) < 0 then
    raise exception 'The discount can''t be negative.';
  end if;
  if coalesce(p_discount, 0) > p_amount then
    raise exception 'The discount can''t exceed the annual fee.';
  end if;

  select id, full_name, school_id into v_student
  from public.students
  where id = p_student_id and school_id = v_school;
  if not found then
    raise exception 'Student not found.';
  end if;

  select id into v_current from public.academic_years
  where school_id = v_school
  order by is_current desc, starts_on desc nulls last, created_at desc
  limit 1;
  v_year_id := coalesce(p_year_id, v_current);
  if v_year_id is null then
    raise exception 'No academic year is configured — add one in Settings first.';
  end if;
  if not exists (
    select 1 from public.academic_years where id = v_year_id and school_id = v_school
  ) then
    raise exception 'That academic year isn''t in your school.';
  end if;

  insert into public.student_fees
    (student_id, year_id, school_id, amount, discount, discount_reason)
  values
    (p_student_id, v_year_id, v_school, p_amount,
     coalesce(p_discount, 0), nullif(trim(coalesce(p_discount_reason, '')), ''))
  on conflict (student_id, year_id) do update
    set amount = excluded.amount,
        discount = excluded.discount,
        discount_reason = excluded.discount_reason;

  -- keep the student form's default in step when the current year moved
  if v_year_id = v_current then
    update public.students set base_fees = p_amount where id = p_student_id;
  end if;

  return jsonb_build_object(
    'student_name', v_student.full_name,
    'due', p_amount - coalesce(p_discount, 0),
    'discount', coalesce(p_discount, 0)
  );
end;
$$;

-- ===================== record_fee_payment: due from the plan =====================
-- Same function as 0019 (atomic payment + receipt, per-student lock,
-- overpayment guard) but "due" is the year's net fee (amount - discount)
-- from student_fees, falling back to base_fees where no plan row exists.
create or replace function public.record_fee_payment(
  p_student_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_student record;
  v_class_name text;
  v_year_id uuid;
  v_due numeric;
  v_paid numeric;
  v_balance numeric;
  v_payment_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  -- RLS on students already limits this to the caller's school.
  select id, full_name, base_fees, mobile, address, parent_mobile, class_id, school_id
    into v_student
  from public.students
  where id = p_student_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  select id into v_year_id from public.academic_years
  where school_id = v_student.school_id
  order by is_current desc, starts_on desc nulls last, created_at desc
  limit 1;
  if v_year_id is null then
    raise exception 'No academic year is configured — add one in Settings first.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  select amount - discount into v_due
  from public.student_fees
  where student_id = p_student_id and year_id = v_year_id;
  if v_due is null then
    v_due := v_student.base_fees;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.fee_payments
  where student_id = p_student_id and year_id = v_year_id;

  v_balance := v_due - v_paid;
  if v_balance <= 0 then
    raise exception 'Fees are already fully paid — nothing is outstanding.';
  end if;
  if p_amount > v_balance then
    raise exception 'Payment of $% exceeds the outstanding balance of $%.',
      trim(to_char(p_amount, 'FM999999990.00')), trim(to_char(v_balance, 'FM999999990.00'));
  end if;

  select name into v_class_name from public.classes where id = v_student.class_id;

  insert into public.fee_payments (student_id, amount, method, note, year_id, school_id)
  values (p_student_id, p_amount, p_method, p_note, v_year_id, v_student.school_id)
  returning id into v_payment_id;

  insert into public.receipts
    (party_type, party_id, party_name, party_detail,
     party_phone, party_address, parent_phone, amount, method, note, school_id)
  values
    ('student', p_student_id, v_student.full_name, v_class_name,
     v_student.mobile, v_student.address, v_student.parent_mobile,
     p_amount, p_method, coalesce(p_note, 'School fees'), v_student.school_id);

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'student_name', v_student.full_name,
    'year_id', v_year_id,
    'paid', v_paid + p_amount,
    'balance', v_balance - p_amount
  );
end;
$$;

-- ===================== balances view: plan-aware =====================
-- Dropped and recreated (not replaced) because three columns are added:
-- gross, discount, discount_reason. due/paid/balance/fee_status keep
-- their meaning — due is now the year's NET fee.
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
  sf.discount_reason
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
) p on true;

grant select on public.student_fee_balances to authenticated;

-- ===================== year switch carries fee plans =====================
-- Same function as 0019, plus: every active student's new-year plan row
-- is seeded from base_fees (their carried default), like enrollments.
create or replace function public.set_current_academic_year(p_year_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school uuid;
  v_name text;
  v_enrolled int;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can switch the academic year.';
  end if;

  v_school := public.current_school_id();
  select name into v_name from public.academic_years
  where id = p_year_id and school_id = v_school;
  if not found then
    raise exception 'Academic year not found.';
  end if;

  update public.academic_years set is_current = false
  where school_id = v_school and is_current and id <> p_year_id;
  update public.academic_years set is_current = true where id = p_year_id;

  insert into public.enrollments (student_id, class_id, year_id, school_id)
  select s.id, s.class_id, p_year_id, s.school_id
  from public.students s
  where s.school_id = v_school and s.status = 'active' and s.class_id is not null
  on conflict (student_id, year_id) do nothing;
  get diagnostics v_enrolled = row_count;

  insert into public.student_fees (student_id, year_id, school_id, amount)
  select s.id, p_year_id, s.school_id, s.base_fees
  from public.students s
  where s.school_id = v_school and s.status = 'active'
  on conflict (student_id, year_id) do nothing;

  return jsonb_build_object('name', v_name, 'enrolled', v_enrolled);
end;
$$;

-- ===================== restore learns about student_fees =====================
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
    'teacher_subjects', 'students', 'student_fees', 'attendance', 'exams',
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

  -- student_fees: restoring students re-created current-year plan rows
  -- via the sync trigger — clear them so the snapshot's own plans (with
  -- their discounts, plus prior years) land without unique conflicts.
  -- Pre-0037 files instead keep the trigger rows and backfill past
  -- years from their payments.
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
