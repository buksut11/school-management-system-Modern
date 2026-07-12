-- Member management + invite-link rotation (multi-tenant follow-up).
--
-- The invite link is a bearer credential: anyone holding it joins as
-- staff. Admins therefore need to (a) revoke a leaked link by rotating
-- the join code, (b) see who has joined, and (c) change roles or remove
-- members. Reads work through existing RLS (members can see same-school
-- profiles); the mutations are SECURITY DEFINER RPCs because profiles
-- RLS only allows self-updates — each function re-checks that the caller
-- is an admin of the same school, and a last-admin guard stops a school
-- from locking itself out.

create or replace function public.rotate_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school uuid;
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can rotate the invite link.';
  end if;
  v_school := public.current_school_id();
  if v_school is null then
    raise exception 'You don''t belong to a school.';
  end if;

  update public.schools
  set join_code = encode(gen_random_bytes(6), 'hex')
  where id = v_school
  returning join_code into v_code;

  return v_code;
end;
$$;

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
  if p_role not in ('admin', 'staff') then
    raise exception 'Role must be admin or staff.';
  end if;

  v_school := public.current_school_id();
  select id, role, school_id into v_target from public.profiles where id = p_user_id;
  if not found or v_target.school_id is distinct from v_school or v_school is null then
    raise exception 'That person isn''t a member of your school.';
  end if;

  -- Demoting the only admin would lock the school out of money,
  -- deletes, year switches and this very panel.
  if v_target.role = 'admin' and p_role = 'staff' then
    if (select count(*) from public.profiles
        where school_id = v_school and role = 'admin') <= 1 then
      raise exception 'You can''t demote the only admin — promote someone else first.';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

create or replace function public.remove_member(p_user_id uuid)
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
    raise exception 'Only an admin account can remove members.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You can''t remove yourself — another admin has to do that.';
  end if;

  v_school := public.current_school_id();
  select id, school_id into v_target from public.profiles where id = p_user_id;
  if not found or v_target.school_id is distinct from v_school or v_school is null then
    raise exception 'That person isn''t a member of your school.';
  end if;

  -- Detach the account; everything they recorded stays with the school.
  update public.profiles set school_id = null, role = 'staff' where id = p_user_id;
end;
$$;
