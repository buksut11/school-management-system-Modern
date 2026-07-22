-- Promotion workflow: advance students to the next class at year rollover
-- (audit §4.3). Until now, switching the academic year carried every
-- student into the new year in the SAME class; there was no bulk
-- "Form 1 → Form 2" step, and no notion of graduating.

-- 1. Each class can name the class it promotes into. Same-school, via the
--    composite key 0029 put on classes; NULL means "final class" — its
--    students graduate rather than advancing. on delete set null so
--    removing a class just clears the pointer instead of blocking.
alter table public.classes
  add column if not exists next_class_id uuid;

alter table public.classes drop constraint if exists classes_next_class_fkey;
alter table public.classes add constraint classes_next_class_fkey
  foreign key (next_class_id, school_id)
  references public.classes (id, school_id) on delete set null;

-- A class can't promote into itself.
alter table public.classes drop constraint if exists classes_next_not_self;
alter table public.classes add constraint classes_next_not_self
  check (next_class_id is null or next_class_id <> id);

-- 2. 'graduated' — final-year students promoted out of the school. Kept on
--    record (and in enrollment history) but out of active rosters, which
--    already filter status = 'active'. Distinct from 'inactive'
--    (withdrawn / dropped out).
alter table public.students drop constraint if exists students_status_check;
alter table public.students add constraint students_status_check
  check (status in ('active', 'inactive', 'graduated'));

-- 3. The promotion itself. Admin only (a staff UPDATE would silently match
--    zero rows under RLS and look like success, so gate explicitly, as
--    set_current_academic_year does). Operates on the CURRENT year: moving
--    students.class_id fires the enrollment sync trigger, so each promoted
--    student's current-year enrollment updates to their new class while
--    prior years stay intact — run this AFTER switching to the new year.
--
-- p_hold_ids are students to keep where they are (repeaters). Both updates
-- read one shared snapshot (the `targets` CTE), so a student promoted into
-- a final class is NOT also graduated in the same run, and the promote /
-- graduate sets never touch the same row twice.
create or replace function public.promote_students(p_hold_ids uuid[] default '{}')
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_promoted int;
  v_graduated int;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can promote students.';
  end if;

  if public.current_academic_year_id() is null then
    raise exception 'No academic year is configured — add one in Settings first.';
  end if;

  with targets as (
    select s.id, c.next_class_id
    from public.students s
    join public.classes c on c.id = s.class_id
    where s.status = 'active'
      and not (s.id = any(coalesce(p_hold_ids, '{}')))
  ),
  promoted as (
    update public.students s
    set class_id = t.next_class_id
    from targets t
    where s.id = t.id and t.next_class_id is not null
    returning s.id
  ),
  graduated as (
    update public.students s
    set status = 'graduated'
    from targets t
    where s.id = t.id and t.next_class_id is null
    returning s.id
  )
  select (select count(*) from promoted), (select count(*) from graduated)
    into v_promoted, v_graduated;

  return jsonb_build_object('promoted', v_promoted, 'graduated', v_graduated);
end;
$$;

grant execute on function public.promote_students(uuid[]) to authenticated;
