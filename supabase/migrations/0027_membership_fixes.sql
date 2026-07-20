-- Membership fixes (audit findings 2.4 and a hygiene gap in 0021).
--
-- 1. join_school() had a race on single-use invites: it checked used_at,
--    did its work, then marked the invite used with an UNCONDITIONAL
--    update — two people redeeming the same code concurrently could both
--    pass the check and both join. The invite is now CLAIMED first, with
--    `where used_at is null` as the atomic guard: whichever transaction
--    commits the claim wins, the other sees zero rows and gets the
--    "already been used" error.
--
-- 2. remove_member() detached the account (school_id -> null) but left
--    profiles.teacher_id and profile_students rows behind. Harmless
--    today (every policy also requires a school match), but a stale
--    grant is a bug waiting for a policy refactor — clear them.

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

  -- Claim the invite BEFORE granting anything. The used_at guard makes
  -- this atomic under concurrency: only one caller can flip it.
  update public.invites
  set used_by = auth.uid(), used_at = now()
  where id = v.id and used_at is null;
  if not found then
    raise exception 'This invite has already been used — each link works exactly once.';
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

  return jsonb_build_object('school_id', v.school_id, 'name', v.school_name, 'role', v.role);
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
  -- Record links go too — a removed member must not keep a teacher or
  -- family grant that would spring back to life if they ever rejoined.
  update public.profiles
  set school_id = null, role = 'staff', teacher_id = null
  where id = p_user_id;
  delete from public.profile_students where profile_id = p_user_id;
end;
$$;
