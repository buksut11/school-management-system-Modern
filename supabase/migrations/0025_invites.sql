-- Personal, single-use invites — shareable join codes are gone.
--
-- The old model put two permanent codes on the schools row, readable by
-- EVERY member under the "schools: members read" policy (staff, teachers,
-- students, parents, even pending accounts) — so anyone could forward the
-- link and anyone holding it could join, forever. Rotation was the only
-- defense, and family joiners still needed manual assignment afterwards.
--
-- Now: the admin issues one invite per person. Each invite
--   • is single-use (marked used on join) and expires in 7 days,
--   • carries the ROLE the person gets, plus optional record links
--     (teacher record for teachers; children for students/parents), so
--     the joiner lands fully set up with no pending state,
--   • can be locked to an email address,
--   • is visible only to admins, and revocable by deleting it.
--
-- The platform owner's flow keeps working: registering a school creates
-- a single-use ADMIN invite; the first head joins with it and runs the
-- school from there.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(8), 'hex'),
  role text not null check (role in ('admin', 'staff', 'finance', 'teacher', 'student', 'parent')),
  email text,
  teacher_id uuid references public.teachers (id) on delete set null,
  student_ids uuid[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_school_idx on public.invites (school_id);

alter table public.invites enable row level security;

-- Admins manage their school's invites; nobody else sees them at all.
-- Creation goes through create_invite() (which validates the links);
-- revocation is a plain delete.
drop policy if exists "invites: admin read" on public.invites;
create policy "invites: admin read" on public.invites
  for select using (school_id = public.current_school_id() and public.is_admin());
drop policy if exists "invites: admin delete" on public.invites;
create policy "invites: admin delete" on public.invites
  for delete using (school_id = public.current_school_id() and public.is_admin());

create or replace function public.create_invite(
  p_role text,
  p_email text default null,
  p_teacher_id uuid default null,
  p_student_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can create invites.';
  end if;
  v_school := public.current_school_id();
  if p_role not in ('staff', 'finance', 'teacher', 'student', 'parent') then
    raise exception 'Unknown role.';
  end if;
  if p_teacher_id is not null and not exists (
    select 1 from public.teachers where id = p_teacher_id and school_id = v_school
  ) then
    raise exception 'That teacher record isn''t in your school.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_student_ids, '{}')) sid
    where not exists (select 1 from public.students s
                      where s.id = sid and s.school_id = v_school)
  ) then
    raise exception 'One of those student records isn''t in your school.';
  end if;
  if p_role in ('student', 'parent') and coalesce(array_length(p_student_ids, 1), 0) = 0 then
    raise exception 'Link at least one student record to a student/parent invite.';
  end if;

  insert into public.invites (school_id, role, email, teacher_id, student_ids)
  values (
    v_school,
    p_role,
    nullif(lower(trim(coalesce(p_email, ''))), ''),
    case when p_role = 'teacher' then p_teacher_id else null end,
    case when p_role in ('student', 'parent') then coalesce(p_student_ids, '{}') else '{}' end
  )
  returning code into v_code;

  return jsonb_build_object('code', v_code);
end;
$$;

-- What a signed-in visitor sees on the /join page before accepting.
create or replace function public.invite_info(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v record;
begin
  select i.*, s.name as school_name into v
  from public.invites i join public.schools s on s.id = i.school_id
  where i.code = lower(trim(p_code));
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'This invite link doesn''t exist — ask the school for a new one.');
  end if;
  if v.used_at is not null then
    return jsonb_build_object('valid', false, 'reason', 'This invite has already been used. Each link works exactly once — ask the school for your own.');
  end if;
  if v.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'This invite has expired — ask the school for a new one.');
  end if;
  return jsonb_build_object('valid', true, 'school_name', v.school_name, 'role', v.role);
end;
$$;

-- join_school now accepts ONLY personal invites.
create or replace function public.join_school(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if (select school_id from public.profiles where id = auth.uid()) is not null then
    raise exception 'You already belong to a school.';
  end if;

  select i.*, s.name as school_name into v
  from public.invites i join public.schools s on s.id = i.school_id
  where i.code = lower(trim(p_code));
  if not found then
    raise exception 'That invite code doesn''t match any school — ask for a new invite.';
  end if;
  if v.used_at is not null then
    raise exception 'This invite has already been used — each link works exactly once.';
  end if;
  if v.expires_at < now() then
    raise exception 'This invite has expired — ask the school for a new one.';
  end if;
  if v.email is not null then
    select lower(email) into v_email from auth.users where id = auth.uid();
    if v_email is distinct from v.email then
      raise exception 'This invite was issued for a different email address.';
    end if;
  end if;

  update public.profiles
  set school_id = v.school_id,
      role = v.role,
      teacher_id = case when v.role = 'teacher' then v.teacher_id else null end
  where id = auth.uid();

  if v.role in ('student', 'parent') and coalesce(array_length(v.student_ids, 1), 0) > 0 then
    insert into public.profile_students (profile_id, student_id)
    select auth.uid(), sid from unnest(v.student_ids) sid
    on conflict do nothing;
  end if;

  update public.invites set used_by = auth.uid(), used_at = now() where id = v.id;

  return jsonb_build_object('school_id', v.school_id, 'name', v.school_name, 'role', v.role);
end;
$$;

-- ===================== retire the shareable codes =====================
drop function if exists public.rotate_join_code();

-- Platform flow: registering a school mints its single-use admin invite.
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

  insert into public.invites (school_id, role, expires_at)
  values (v_school, 'admin', now() + interval '30 days')
  returning code into v_code;

  return jsonb_build_object('school_id', v_school, 'name', trim(p_name), 'invite_code', v_code);
end;
$$;

-- Get (or mint) the school's admin invite — for re-copying from the
-- platform panel when the original expired or scrolled away. Refuses
-- once the school has an admin: from then on, that admin invites.
create or replace function public.platform_admin_invite(p_school_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can issue admin invites.';
  end if;
  if not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;
  if exists (select 1 from public.profiles where school_id = p_school_id and role = 'admin') then
    raise exception 'That school already has an admin — they can invite from Settings → Members.';
  end if;

  select code into v_code from public.invites
  where school_id = p_school_id and role = 'admin'
    and used_at is null and expires_at > now()
  order by created_at desc limit 1;
  if v_code is not null then
    return v_code;
  end if;

  insert into public.invites (school_id, role, expires_at)
  values (p_school_id, 'admin', now() + interval '30 days')
  returning code into v_code;
  return v_code;
end;
$$;

-- platform_list_schools loses the join_code column (return type change
-- requires a drop) and reports whether the school has an admin yet.
drop function if exists public.platform_list_schools();
create function public.platform_list_schools()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  members bigint,
  students bigint,
  has_admin boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can list schools.';
  end if;
  return query
    select s.id, s.name, s.created_at,
      (select count(*) from public.profiles p where p.school_id = s.id),
      (select count(*) from public.students st where st.school_id = s.id),
      exists (select 1 from public.profiles p where p.school_id = s.id and p.role = 'admin')
    from public.schools s
    order by s.created_at;
end;
$$;

-- Finally: the codes themselves go away, and with them every path that
-- read them.
alter table public.schools drop column if exists join_code;
alter table public.schools drop column if exists family_join_code;
