-- Full role model: admin, staff, finance, teacher, student, parent
-- (+ a hidden "pending" state for family-link joiners awaiting assignment).
--
--   admin    school owner: everything, as before.
--   staff    office/registrar: academics create+edit (no deletes), can
--            RECORD fee payments (cash desk) but never edit/delete money,
--            and cannot see expenses (salaries live there).
--   finance  bursar: full money access including expenses; academics
--            read-only.
--   teacher  linked to a teachers row; reads school academics, writes
--            attendance and exam records ONLY for classes they teach —
--            enforced by RLS, not by the UI.
--   student  linked to their students row; sees only their own
--            attendance, exams, fee balance and receipts. Read-only.
--   parent   linked to one or more students; same visibility over their
--            children. Read-only.
--   pending  someone who joined with the FAMILY invite link and hasn't
--            been assigned yet. Sees nothing.
--
-- Two invite links per school: the existing staff link (join_code, first
-- joiner becomes admin as before) and a new family link
-- (family_join_code) whose joiners become 'pending' until the admin
-- assigns student/parent and links their child records in Members.

-- ===================== role set + record links =====================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'staff', 'finance', 'teacher', 'student', 'parent', 'pending'));

alter table public.profiles
  add column if not exists teacher_id uuid references public.teachers (id) on delete set null;

create table if not exists public.profile_students (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, student_id)
);

alter table public.profile_students enable row level security;

alter table public.schools
  add column if not exists family_join_code text unique default encode(gen_random_bytes(6), 'hex');
update public.schools set family_join_code = encode(gen_random_bytes(6), 'hex')
  where family_join_code is null;
alter table public.schools alter column family_join_code set not null;

-- ===================== role helpers (SECURITY DEFINER) =====================
create or replace function public.current_member_role()
returns text
language sql security definer set search_path = public stable
as $$
  select role from public.profiles
  where id = auth.uid() and school_id is not null;
$$;

-- whole-school visibility over academic data
create or replace function public.is_school_staff()
returns boolean
language sql security definer set search_path = public stable
as $$
  select public.current_member_role() in ('admin', 'staff', 'finance', 'teacher');
$$;

-- may create/edit academic records school-wide
create or replace function public.is_office()
returns boolean
language sql security definer set search_path = public stable
as $$
  select public.current_member_role() in ('admin', 'staff');
$$;

-- full money authority
create or replace function public.is_finance()
returns boolean
language sql security definer set search_path = public stable
as $$
  select public.current_member_role() in ('admin', 'finance');
$$;

-- may see money records (fees desk includes office staff)
create or replace function public.sees_money()
returns boolean
language sql security definer set search_path = public stable
as $$
  select public.current_member_role() in ('admin', 'finance', 'staff');
$$;

-- an assigned member (anything but pending / no school)
create or replace function public.is_active_member()
returns boolean
language sql security definer set search_path = public stable
as $$
  select public.current_member_role() is not null
     and public.current_member_role() <> 'pending';
$$;

-- the student rows this account may see (self-link or children)
create or replace function public.my_student_ids()
returns setof uuid
language sql security definer set search_path = public stable
as $$
  select student_id from public.profile_students where profile_id = auth.uid();
$$;

-- the classes this teacher account teaches
create or replace function public.my_class_ids()
returns setof uuid
language sql security definer set search_path = public stable
as $$
  select c.id from public.classes c
  join public.profiles p on p.teacher_id = c.teacher_id
  where p.id = auth.uid() and p.teacher_id is not null;
$$;

-- profile_students: the member sees their own links; school staff see
-- links for their school's students (Members panel). Writes go through
-- the definer RPC only.
drop policy if exists "profile_students: read" on public.profile_students;
create policy "profile_students: read" on public.profile_students
  for select using (
    profile_id = auth.uid()
    or (public.is_school_staff() and exists (
      select 1 from public.students s
      where s.id = student_id and s.school_id = public.current_school_id()
    ))
  );

-- ===================== policy rewrite =====================
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'classes', 'teachers', 'students', 'attendance', 'activity_log',
        'departments', 'subjects', 'exams', 'fee_payments', 'expenses',
        'invoices', 'receipts', 'academic_years', 'enrollments'
      )
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- students: staff-wide read; self/children for student+parent
create policy "students: read" on public.students for select
  using (school_id = public.current_school_id()
         and (public.is_school_staff() or id in (select public.my_student_ids())));
create policy "students: office write" on public.students for insert
  with check (school_id = public.current_school_id() and public.is_office());
create policy "students: office update" on public.students for update
  using (school_id = public.current_school_id() and public.is_office())
  with check (school_id = public.current_school_id() and public.is_office());
create policy "students: admin delete" on public.students for delete
  using (school_id = public.current_school_id() and public.is_admin());

-- teachers: staff read (contact details stay off family portals)
create policy "teachers: read" on public.teachers for select
  using (school_id = public.current_school_id() and public.is_school_staff());
create policy "teachers: office write" on public.teachers for insert
  with check (school_id = public.current_school_id() and public.is_office());
create policy "teachers: office update" on public.teachers for update
  using (school_id = public.current_school_id() and public.is_office())
  with check (school_id = public.current_school_id() and public.is_office());
create policy "teachers: admin delete" on public.teachers for delete
  using (school_id = public.current_school_id() and public.is_admin());

-- classes / subjects / departments: names are needed by every role
do $$
declare
  t text;
begin
  foreach t in array array['classes', 'subjects', 'departments'] loop
    execute format('create policy "%s: member read" on public.%I for select
      using (school_id = public.current_school_id() and public.is_active_member())', t, t);
    execute format('create policy "%s: office insert" on public.%I for insert
      with check (school_id = public.current_school_id() and public.is_office())', t, t);
    execute format('create policy "%s: office update" on public.%I for update
      using (school_id = public.current_school_id() and public.is_office())
      with check (school_id = public.current_school_id() and public.is_office())', t, t);
    execute format('create policy "%s: admin delete" on public.%I for delete
      using (school_id = public.current_school_id() and public.is_admin())', t, t);
  end loop;
end;
$$;

-- attendance + exams: office writes school-wide; teachers only their class
do $$
declare
  t text;
begin
  foreach t in array array['attendance', 'exams'] loop
    execute format('create policy "%s: read" on public.%I for select
      using (school_id = public.current_school_id()
             and (public.is_school_staff() or student_id in (select public.my_student_ids())))', t, t);
    execute format('create policy "%s: write" on public.%I for insert
      with check (school_id = public.current_school_id()
                  and (public.is_office()
                       or (public.current_member_role() = ''teacher''
                           and class_id in (select public.my_class_ids()))))', t, t);
    execute format('create policy "%s: update" on public.%I for update
      using (school_id = public.current_school_id()
             and (public.is_office()
                  or (public.current_member_role() = ''teacher''
                      and class_id in (select public.my_class_ids()))))
      with check (school_id = public.current_school_id()
                  and (public.is_office()
                       or (public.current_member_role() = ''teacher''
                           and class_id in (select public.my_class_ids()))))', t, t);
    execute format('create policy "%s: admin delete" on public.%I for delete
      using (school_id = public.current_school_id() and public.is_admin())', t, t);
  end loop;
end;
$$;

-- fee_payments: money desk reads; staff may RECORD; only finance edits
create policy "fee_payments: read" on public.fee_payments for select
  using (school_id = public.current_school_id()
         and (public.sees_money() or student_id in (select public.my_student_ids())));
create policy "fee_payments: desk insert" on public.fee_payments for insert
  with check (school_id = public.current_school_id() and public.sees_money());
create policy "fee_payments: finance update" on public.fee_payments for update
  using (school_id = public.current_school_id() and public.is_finance());
create policy "fee_payments: finance delete" on public.fee_payments for delete
  using (school_id = public.current_school_id() and public.is_finance());

-- expenses: salaries live here — finance/admin ONLY, even for reads
create policy "expenses: finance read" on public.expenses for select
  using (school_id = public.current_school_id() and public.is_finance());
create policy "expenses: finance insert" on public.expenses for insert
  with check (school_id = public.current_school_id() and public.is_finance());
create policy "expenses: finance update" on public.expenses for update
  using (school_id = public.current_school_id() and public.is_finance());
create policy "expenses: finance delete" on public.expenses for delete
  using (school_id = public.current_school_id() and public.is_finance());

-- invoices: money desk reads + family sees their own; finance writes
create policy "invoices: read" on public.invoices for select
  using (school_id = public.current_school_id()
         and (public.sees_money() or party_id in (select public.my_student_ids())));
create policy "invoices: finance insert" on public.invoices for insert
  with check (school_id = public.current_school_id() and public.is_finance());
create policy "invoices: finance update" on public.invoices for update
  using (school_id = public.current_school_id() and public.is_finance());
create policy "invoices: finance delete" on public.invoices for delete
  using (school_id = public.current_school_id() and public.is_finance());

-- receipts: staff insert too (record_fee_payment issues the receipt)
create policy "receipts: read" on public.receipts for select
  using (school_id = public.current_school_id()
         and (public.sees_money() or party_id in (select public.my_student_ids())));
create policy "receipts: desk insert" on public.receipts for insert
  with check (school_id = public.current_school_id() and public.sees_money());
create policy "receipts: finance update" on public.receipts for update
  using (school_id = public.current_school_id() and public.is_finance());
create policy "receipts: finance delete" on public.receipts for delete
  using (school_id = public.current_school_id() and public.is_finance());

-- academic_years: everyone assigned needs the calendar; admin writes
create policy "academic_years: member read" on public.academic_years for select
  using (school_id = public.current_school_id() and public.is_active_member());
create policy "academic_years: admin insert" on public.academic_years for insert
  with check (school_id = public.current_school_id() and public.is_admin());
create policy "academic_years: admin update" on public.academic_years for update
  using (school_id = public.current_school_id() and public.is_admin());
create policy "academic_years: admin delete" on public.academic_years for delete
  using (school_id = public.current_school_id() and public.is_admin());

-- enrollments: history follows the same read split; office maintains it
create policy "enrollments: read" on public.enrollments for select
  using (school_id = public.current_school_id()
         and (public.is_school_staff() or student_id in (select public.my_student_ids())));
create policy "enrollments: office insert" on public.enrollments for insert
  with check (school_id = public.current_school_id() and public.is_office());
create policy "enrollments: office update" on public.enrollments for update
  using (school_id = public.current_school_id() and public.is_office());
create policy "enrollments: admin delete" on public.enrollments for delete
  using (school_id = public.current_school_id() and public.is_admin());

-- activity_log: an internal staff feed; any member may append (joins log)
create policy "activity_log: staff read" on public.activity_log for select
  using (school_id = public.current_school_id() and public.is_school_staff());
create policy "activity_log: member insert" on public.activity_log for insert
  with check (school_id = public.current_school_id());

-- profiles: family accounts shouldn't browse the staff directory
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (
    id = auth.uid()
    or (school_id is not null
        and school_id = public.current_school_id()
        and public.is_school_staff())
  );

-- ===================== join: two links, two destinies =====================
create or replace function public.join_school(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_name text;
  v_role text;
  v_kind text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if (select school_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You already belong to a school.';
  end if;

  select id, name, 'staff' into v_school, v_name, v_kind
  from public.schools where join_code = lower(trim(p_code));
  if not found then
    select id, name, 'family' into v_school, v_name, v_kind
    from public.schools where family_join_code = lower(trim(p_code));
    if not found then
      raise exception 'That join code doesn''t match any school.';
    end if;
  end if;

  if v_kind = 'family' then
    -- Awaits assignment: the admin sets student/parent and links the
    -- child records in Settings → Members. Until then they see nothing.
    v_role := 'pending';
  else
    -- The first person into a freshly provisioned school runs it.
    select case
      when exists (select 1 from public.profiles where school_id = v_school) then 'staff'
      else 'admin'
    end into v_role;
  end if;

  update public.profiles set school_id = v_school, role = v_role
  where id = auth.uid();

  return jsonb_build_object('school_id', v_school, 'name', v_name, 'role', v_role);
end;
$$;

-- ===================== member RPCs: roles + record links =====================
create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_target record;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can change member roles.';
  end if;
  if p_role not in ('admin', 'staff', 'finance', 'teacher', 'student', 'parent') then
    raise exception 'Unknown role.';
  end if;

  v_school := public.current_school_id();
  select id, role, school_id into v_target from public.profiles where id = p_user_id;
  if not found or v_target.school_id is distinct from v_school or v_school is null then
    raise exception 'That person isn''t a member of your school.';
  end if;

  if v_target.role = 'admin' and p_role <> 'admin' then
    if (select count(*) from public.profiles
        where school_id = v_school and role = 'admin') <= 1 then
      raise exception 'You can''t demote the only admin — promote someone else first.';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  -- Stale links must not outlive the role that justified them: an old
  -- teacher link would keep granting class writes, old child links would
  -- keep granting family reads.
  if p_role <> 'teacher' then
    update public.profiles set teacher_id = null where id = p_user_id;
  end if;
  if p_role not in ('student', 'parent') then
    delete from public.profile_students where profile_id = p_user_id;
  end if;
end;
$$;

create or replace function public.link_member_teacher(p_user_id uuid, p_teacher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can link members.';
  end if;
  v_school := public.current_school_id();
  if not exists (select 1 from public.profiles
                 where id = p_user_id and school_id = v_school and role = 'teacher') then
    raise exception 'That member isn''t a teacher at your school.';
  end if;
  if p_teacher_id is not null and not exists (
    select 1 from public.teachers where id = p_teacher_id and school_id = v_school
  ) then
    raise exception 'That teacher record isn''t in your school.';
  end if;

  update public.profiles set teacher_id = p_teacher_id where id = p_user_id;
end;
$$;

create or replace function public.link_member_students(p_user_id uuid, p_student_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can link members.';
  end if;
  v_school := public.current_school_id();
  if not exists (select 1 from public.profiles
                 where id = p_user_id and school_id = v_school
                   and role in ('student', 'parent')) then
    raise exception 'That member isn''t a student or parent at your school.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_student_ids, '{}')) sid
    where not exists (select 1 from public.students s
                      where s.id = sid and s.school_id = v_school)
  ) then
    raise exception 'One of those student records isn''t in your school.';
  end if;

  delete from public.profile_students where profile_id = p_user_id;
  insert into public.profile_students (profile_id, student_id)
  select p_user_id, sid from unnest(coalesce(p_student_ids, '{}')) sid;
end;
$$;
