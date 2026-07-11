-- ============================================================================
-- Multi-tenant foundation: schools as tenants, RLS-scoped everything.
--
-- Design: RLS-centric tenancy. Every tenant table gets school_id with a
-- DEFAULT of the caller's school, and every policy filters on it. The
-- database stamps and filters rows automatically, so existing app queries
-- keep working unchanged — they just see one school's slice.
--
--   • schools            — the tenant. join_code lets staff self-enroll.
--   • profiles.school_id — one school per user (v1). role stays per-user
--                          within that school (admin/staff).
--   • current_school_id()— the caller's school, from their profile. A
--                          service context (SQL editor, seed script) with
--                          no auth.uid() can set the app.school_id GUC
--                          instead; it is IGNORED for signed-in users so
--                          clients can't spoof tenancy.
--   • create_school() / join_school() — onboarding RPCs for users who
--                          sign up and aren't in a school yet.
--
-- Backfill: all existing data (and all existing profiles) belong to the
-- original school, created here. Existing single-school deployments keep
-- working with zero data changes visible to their users.
--
-- Uniques that were global become per-school (class names, department
-- names, year names, the one-current-year rule).
-- ============================================================================

-- ===================== schools (tenants) =====================
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.schools;
create trigger set_updated_at before update on public.schools
  for each row execute function public.set_updated_at();

alter table public.profiles
  add column if not exists school_id uuid references public.schools (id) on delete set null;

create index if not exists profiles_school_idx on public.profiles (school_id);

-- ===================== tenant resolution =====================
-- SECURITY DEFINER so it can read profiles regardless of RLS. The GUC
-- escape hatch only applies when there is no signed-in user, so API
-- clients can never pick their tenant.
create or replace function public.current_school_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v uuid;
begin
  if auth.uid() is not null then
    select school_id into v from public.profiles where id = auth.uid();
    return v;
  end if;
  return nullif(current_setting('app.school_id', true), '')::uuid;
end;
$$;

-- ===================== backfill the original school =====================
do $$
declare
  v_school uuid;
begin
  if exists (select 1 from public.schools) then
    return; -- already multi-tenant
  end if;
  -- Create the original school whenever there is anything to own. classes
  -- are seeded by 0001, so a fresh install gets its school here too.
  if exists (select 1 from public.classes)
     or exists (select 1 from public.students)
     or exists (select 1 from public.profiles) then
    insert into public.schools (name)
    values ('Sh.Asharow Primary & Secondary School')
    returning id into v_school;
    update public.profiles set school_id = v_school where school_id is null;
    -- session-level (not transaction-local): the backfill loop below runs
    -- in its own transaction and still needs to see this
    perform set_config('app.school_id', v_school::text, false);
  end if;
end;
$$;

-- ===================== school_id on every tenant table =====================
do $$
declare
  t text;
  v_school uuid := nullif(current_setting('app.school_id', true), '')::uuid;
begin
  foreach t in array array[
    'classes', 'teachers', 'students', 'attendance', 'activity_log',
    'departments', 'subjects', 'exams', 'fee_payments', 'expenses',
    'invoices', 'receipts', 'academic_years', 'enrollments'
  ] loop
    execute format(
      'alter table public.%I add column if not exists school_id uuid references public.schools (id) on delete cascade', t);
    if v_school is not null then
      execute format('update public.%I set school_id = $1 where school_id is null', t) using v_school;
    end if;
    execute format('alter table public.%I alter column school_id set default public.current_school_id()', t);
    -- Guard against untenanted rows even if a default ever resolves null.
    execute format('alter table public.%I alter column school_id set not null', t);
    execute format('create index if not exists %I on public.%I (school_id)', t || '_school_idx', t);
  end loop;
end;
$$;

-- ===================== per-school uniques =====================
alter table public.classes drop constraint if exists classes_name_key;
alter table public.classes drop constraint if exists classes_school_name_key;
alter table public.classes add constraint classes_school_name_key unique (school_id, name);

alter table public.departments drop constraint if exists departments_name_key;
alter table public.departments drop constraint if exists departments_school_name_key;
alter table public.departments add constraint departments_school_name_key unique (school_id, name);

alter table public.academic_years drop constraint if exists academic_years_name_key;
alter table public.academic_years drop constraint if exists academic_years_school_name_key;
alter table public.academic_years add constraint academic_years_school_name_key unique (school_id, name);

-- one current year PER SCHOOL, not globally
drop index if exists academic_years_current_idx;
create unique index if not exists academic_years_current_idx
  on public.academic_years (school_id) where is_current;

-- ===================== tenant-aware helpers =====================
create or replace function public.current_academic_year_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select id from public.academic_years
  where school_id = public.current_school_id()
  order by is_current desc, starts_on desc nulls last, created_at desc
  limit 1
$$;

create or replace function public.sync_enrollment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_year_id uuid;
begin
  if new.class_id is not null then
    select id into v_year_id from public.academic_years
    where school_id = new.school_id
    order by is_current desc, starts_on desc nulls last, created_at desc
    limit 1;
    if v_year_id is not null then
      insert into public.enrollments (student_id, class_id, year_id, school_id)
      values (new.id, new.class_id, v_year_id, new.school_id)
      on conflict (student_id, year_id) do update set class_id = excluded.class_id;
    end if;
  end if;
  return new;
end;
$$;

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

  return jsonb_build_object('name', v_name, 'enrolled', v_enrolled);
end;
$$;

-- The balance view keeps working as-is: it's security_invoker, so the
-- school-scoped RLS below filters its rows, and current_academic_year_id()
-- is now per-school. Recreate to be explicit about the year join.
create or replace view public.student_fee_balances
with (security_invoker = true)
as
select
  s.id as student_id,
  s.full_name,
  s.photo_url,
  s.class_id,
  c.name as class_name,
  s.status as student_status,
  s.base_fees as due,
  coalesce(p.paid, 0) as paid,
  greatest(s.base_fees - coalesce(p.paid, 0), 0) as balance,
  case
    when s.base_fees - coalesce(p.paid, 0) <= 0 then 'paid'
    when coalesce(p.paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as fee_status
from public.students s
left join public.classes c on c.id = s.class_id
left join lateral (
  select sum(fp.amount) as paid
  from public.fee_payments fp
  where fp.student_id = s.id
    and fp.year_id = (
      select ay.id from public.academic_years ay
      where ay.school_id = s.school_id
      order by ay.is_current desc, ay.starts_on desc nulls last, ay.created_at desc
      limit 1
    )
) p on true;

-- ===================== onboarding: new users =====================
-- No more "first signup is admin": a fresh signup belongs to no school
-- and sees nothing until they create one or join with a code.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'staff');
  return new;
end;
$$;

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
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'School name is required.';
  end if;
  if (select school_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You already belong to a school.';
  end if;

  insert into public.schools (name) values (trim(p_name))
  returning id, join_code into v_school, v_code;

  update public.profiles set school_id = v_school, role = 'admin'
  where id = auth.uid();

  -- Every school needs a current academic year before exams or fee
  -- payments can be recorded — seed the first one (Aug–Jul calendar).
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

  return jsonb_build_object('school_id', v_school, 'join_code', v_code);
end;
$$;

create or replace function public.join_school(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if (select school_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You already belong to a school.';
  end if;

  select id, name into v_school, v_name
  from public.schools where join_code = lower(trim(p_code));
  if not found then
    raise exception 'That join code doesn''t match any school.';
  end if;

  update public.profiles set school_id = v_school, role = 'staff'
  where id = auth.uid();

  return jsonb_build_object('school_id', v_school, 'name', v_name);
end;
$$;

-- ===================== RLS: everything scoped to the school =====================
alter table public.schools enable row level security;

drop policy if exists "schools: members read" on public.schools;
create policy "schools: members read" on public.schools
  for select using (id = public.current_school_id());
drop policy if exists "schools: admin update" on public.schools;
create policy "schools: admin update" on public.schools
  for update using (id = public.current_school_id() and public.is_admin());
-- no insert/delete policies: tenants are created via create_school()
-- (security definer) and removed only by the platform operator.

-- profiles: own row, plus colleagues' names for the same school.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or (school_id is not null and school_id = public.current_school_id()));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

do $$
declare
  t text;
  staff_tables text[] := array[
    'classes', 'teachers', 'students', 'attendance', 'departments',
    'subjects', 'exams', 'enrollments'
  ];
  admin_tables text[] := array[
    'fee_payments', 'expenses', 'invoices', 'receipts', 'academic_years'
  ];
  pol record;
begin
  -- drop every existing policy on the tenant tables; they predate tenancy
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (staff_tables || admin_tables || array['activity_log'])
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  -- staff tables: members read/write, admins delete
  foreach t in array staff_tables loop
    execute format('create policy "%s: member read" on public.%I for select
      using (school_id = public.current_school_id())', t, t);
    execute format('create policy "%s: member insert" on public.%I for insert
      with check (school_id = public.current_school_id())', t, t);
    execute format('create policy "%s: member update" on public.%I for update
      using (school_id = public.current_school_id())
      with check (school_id = public.current_school_id())', t, t);
    execute format('create policy "%s: admin delete" on public.%I for delete
      using (school_id = public.current_school_id() and public.is_admin())', t, t);
  end loop;

  -- money + calendar: members read, admins write
  foreach t in array admin_tables loop
    execute format('create policy "%s: member read" on public.%I for select
      using (school_id = public.current_school_id())', t, t);
    execute format('create policy "%s: admin insert" on public.%I for insert
      with check (school_id = public.current_school_id() and public.is_admin())', t, t);
    execute format('create policy "%s: admin update" on public.%I for update
      using (school_id = public.current_school_id() and public.is_admin())
      with check (school_id = public.current_school_id() and public.is_admin())', t, t);
    execute format('create policy "%s: admin delete" on public.%I for delete
      using (school_id = public.current_school_id() and public.is_admin())', t, t);
  end loop;
end;
$$;

-- activity_log: members read + append within their school
drop policy if exists "activity_log: member read" on public.activity_log;
create policy "activity_log: member read" on public.activity_log
  for select using (school_id = public.current_school_id());
drop policy if exists "activity_log: member insert" on public.activity_log;
create policy "activity_log: member insert" on public.activity_log
  for insert with check (school_id = public.current_school_id());
