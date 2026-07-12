-- Manual school provisioning (product decision: no self-serve tenants).
--
-- Schools are created only by the PLATFORM OWNER — the person who runs
-- this deployment — never by whoever signs up. The flow becomes:
--
--   1. Owner creates the school in Settings → Platform (or SQL) and
--      copies its invite link.
--   2. Owner sends the link to the school's head.
--   3. The head signs up and opens the link. The FIRST member to join a
--      school automatically becomes its admin (there is no one else who
--      could), so the owner never has to manage their account.
--   4. The new admin invites their own staff with the same link; later
--      joiners are staff as before.
--
-- profiles.is_platform_admin marks the owner. The migration grants it to
-- the admins of the oldest school (the original single-tenant school —
-- i.e. you) if nobody holds it yet; grant or revoke it any time with:
--   update public.profiles set is_platform_admin = true|false where id = '<uuid>';

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_platform_admin
  );
$$;

-- bootstrap: the original school's admins run the platform
do $$
begin
  if not exists (select 1 from public.profiles where is_platform_admin) then
    update public.profiles set is_platform_admin = true
    where role = 'admin'
      and school_id = (select id from public.schools order by created_at limit 1);
  end if;
end;
$$;

-- ===================== create_school: owner-only =====================
-- Replaces the self-serve version from 0019: it no longer attaches the
-- caller to the new school (the owner keeps running their own), and only
-- a platform admin may call it.
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
  returning id, join_code into v_school, v_code;

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

  return jsonb_build_object('school_id', v_school, 'name', trim(p_name), 'join_code', v_code);
end;
$$;

-- ===================== join_school: first member is admin =====================
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

  -- The first person into a freshly provisioned school runs it.
  select case
    when exists (select 1 from public.profiles where school_id = v_school) then 'staff'
    else 'admin'
  end into v_role;

  update public.profiles set school_id = v_school, role = v_role
  where id = auth.uid();

  return jsonb_build_object('school_id', v_school, 'name', v_name, 'role', v_role);
end;
$$;

-- ===================== platform overview + offboarding =====================
create or replace function public.platform_list_schools()
returns table (
  id uuid,
  name text,
  join_code text,
  created_at timestamptz,
  members bigint,
  students bigint
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
    select s.id, s.name, s.join_code, s.created_at,
      (select count(*) from public.profiles p where p.school_id = s.id),
      (select count(*) from public.students st where st.school_id = s.id)
    from public.schools s
    order by s.created_at;
end;
$$;

create or replace function public.platform_delete_school(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only the platform owner can remove a school.';
  end if;
  -- Refuse to delete the school the owner is standing in — that would
  -- take the platform down with it.
  if p_school_id = public.current_school_id() then
    raise exception 'You can''t delete your own school from here.';
  end if;
  if not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'School not found.';
  end if;

  -- Members are detached (profiles.school_id -> set null); every data
  -- row cascades with the school.
  delete from public.schools where id = p_school_id;
end;
$$;
