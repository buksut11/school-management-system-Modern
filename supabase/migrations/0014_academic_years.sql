-- Academic years — the missing calendar dimension (from schema review).
--
-- Nothing in the schema represented a school year, which put a hard
-- ceiling on the data model:
--
--   • exams had unique (student_id, term) with term ∈ {Term 1..3}, so a
--     student could hold exactly one record per term EVER — next year's
--     Term 1 collided with last year's. Academic history was not
--     representable.
--   • fee_payments had no year either: fees were a single lifetime
--     bucket, so a returning student looked "paid" forever after their
--     first full year, and per-year collection reports were impossible.
--
-- This migration adds academic_years (with at most one marked current),
-- stamps exams and fee_payments with year_id, widens the exams unique key
-- to (student_id, term, year_id), and re-scopes record_fee_payment() so
-- base_fees means "fees per academic year": balances reset when a new
-- year is made current, while every prior year's ledger stays intact.
--
-- Existing rows are backfilled onto the seeded current year — the same
-- best-effort call 0007 made when it backfilled attendance.class_id.

-- ===================== academic_years =====================
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  name text not null unique,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- at most one year can be current
create unique index if not exists academic_years_current_idx
  on public.academic_years (is_current) where is_current;

alter table public.academic_years enable row level security;

-- Same posture as the other structural/money tables: everyone signed in
-- can read, only admins can change the calendar (switching the current
-- year resets every fee balance, so it must not be a staff-level action).
drop policy if exists "academic_years: read" on public.academic_years;
create policy "academic_years: read" on public.academic_years
  for select using (auth.role() = 'authenticated');
drop policy if exists "academic_years: admin write" on public.academic_years;
create policy "academic_years: admin write" on public.academic_years
  for insert with check (public.is_admin());
drop policy if exists "academic_years: admin update" on public.academic_years;
create policy "academic_years: admin update" on public.academic_years
  for update using (public.is_admin());
drop policy if exists "academic_years: admin delete" on public.academic_years;
create policy "academic_years: admin delete" on public.academic_years
  for delete using (public.is_admin());

-- Seed the first year from today's date (Aug–Jul school calendar), only
-- on databases that have none — never touches an already-configured one.
insert into public.academic_years (name, starts_on, ends_on, is_current)
select
  y.start_year || '-' || (y.start_year + 1),
  make_date(y.start_year, 8, 1),
  make_date(y.start_year + 1, 7, 31),
  true
from (
  select case
    when extract(month from current_date) >= 8 then extract(year from current_date)::int
    else extract(year from current_date)::int - 1
  end as start_year
) y
where not exists (select 1 from public.academic_years);

-- Prefers the year flagged current; falls back to the newest so inserts
-- keep working even if an admin unflags every year.
create or replace function public.current_academic_year_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select id from public.academic_years
  order by is_current desc, starts_on desc nulls last, created_at desc
  limit 1
$$;

-- ===================== exams get a year =====================
alter table public.exams
  add column if not exists year_id uuid references public.academic_years (id) on delete restrict;

update public.exams set year_id = public.current_academic_year_id() where year_id is null;

alter table public.exams alter column year_id set default public.current_academic_year_id();
alter table public.exams alter column year_id set not null;

alter table public.exams drop constraint if exists exams_student_id_term_key;
alter table public.exams drop constraint if exists exams_student_term_year_key;
alter table public.exams
  add constraint exams_student_term_year_key unique (student_id, term, year_id);

create index if not exists exams_year_idx on public.exams (year_id);

-- ===================== fee payments get a year =====================
alter table public.fee_payments
  add column if not exists year_id uuid references public.academic_years (id) on delete restrict;

update public.fee_payments set year_id = public.current_academic_year_id() where year_id is null;

alter table public.fee_payments alter column year_id set default public.current_academic_year_id();
alter table public.fee_payments alter column year_id set not null;

create index if not exists fee_payments_year_idx on public.fee_payments (year_id);

-- ===================== record_fee_payment: per-year balances =====================
-- Same function as 0013 (atomic payment + receipt, per-student lock,
-- overpayment guard) but the balance is now computed against the current
-- year's payments only, and the payment is stamped with that year.
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
  v_paid numeric;
  v_balance numeric;
  v_payment_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  v_year_id := public.current_academic_year_id();
  if v_year_id is null then
    raise exception 'No academic year is configured — add one in Settings first.';
  end if;

  -- Serialize concurrent payments for the same student so the balance
  -- check below can't race (lock releases at end of transaction).
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  select id, full_name, base_fees, mobile, address, parent_mobile, class_id
    into v_student
  from public.students
  where id = p_student_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.fee_payments
  where student_id = p_student_id and year_id = v_year_id;

  v_balance := v_student.base_fees - v_paid;
  if v_balance <= 0 then
    raise exception 'Fees are already fully paid — nothing is outstanding.';
  end if;
  if p_amount > v_balance then
    raise exception 'Payment of $% exceeds the outstanding balance of $%.',
      trim(to_char(p_amount, 'FM999999990.00')), trim(to_char(v_balance, 'FM999999990.00'));
  end if;

  select name into v_class_name from public.classes where id = v_student.class_id;

  insert into public.fee_payments (student_id, amount, method, note, year_id)
  values (p_student_id, p_amount, p_method, p_note, v_year_id)
  returning id into v_payment_id;

  insert into public.receipts
    (party_type, party_id, party_name, party_detail,
     party_phone, party_address, parent_phone, amount, method, note)
  values
    ('student', p_student_id, v_student.full_name, v_class_name,
     v_student.mobile, v_student.address, v_student.parent_mobile,
     p_amount, p_method, coalesce(p_note, 'School fees'));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'student_name', v_student.full_name,
    'year_id', v_year_id,
    'paid', v_paid + p_amount,
    'balance', v_balance - p_amount
  );
end;
$$;
