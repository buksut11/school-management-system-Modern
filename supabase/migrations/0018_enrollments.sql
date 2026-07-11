-- Enrollment history (from schema review).
--
-- students.class_id only says where a student is NOW. There was no record
-- of which class they were in during a previous academic year, so the
-- moment the school rolls into a new year, history loses its class
-- context ("which class was Ayaan in during 2025-2026?" becomes
-- unanswerable).
--
-- enrollments records student ↔ class per academic year, one row per
-- student per year, and is maintained entirely by the database:
--
--   • a trigger on students snapshots/updates the current year's row
--     whenever a student is created or moved — the app never has to
--     remember;
--   • set_current_academic_year() switches the year atomically (the old
--     two-step flag swap could be observed current-less halfway) and
--     carries every active student's class into the new year as their
--     starting enrollment, ready to be edited as promotions happen.
--
-- students.class_id stays as the fast "current class" pointer the whole
-- app reads; enrollments is the history behind it.

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  year_id uuid not null references public.academic_years (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, year_id)
);

create index if not exists enrollments_class_year_idx on public.enrollments (class_id, year_id);

drop trigger if exists set_updated_at on public.enrollments;
create trigger set_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

alter table public.enrollments enable row level security;

-- Staff maintain students day-to-day and the sync trigger below writes
-- as the acting user, so staff need write access; deletes stay admin-only
-- like the other history tables.
drop policy if exists "enrollments: read" on public.enrollments;
create policy "enrollments: read" on public.enrollments
  for select using (auth.role() = 'authenticated');
drop policy if exists "enrollments: write" on public.enrollments;
create policy "enrollments: write" on public.enrollments
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "enrollments: update" on public.enrollments;
create policy "enrollments: update" on public.enrollments
  for update using (auth.role() = 'authenticated');
drop policy if exists "enrollments: delete (admin only)" on public.enrollments;
create policy "enrollments: delete (admin only)" on public.enrollments
  for delete using (public.is_admin());

-- ===================== auto-sync from students =====================
create or replace function public.sync_enrollment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_year_id uuid;
begin
  if new.class_id is not null then
    v_year_id := public.current_academic_year_id();
    if v_year_id is not null then
      insert into public.enrollments (student_id, class_id, year_id)
      values (new.id, new.class_id, v_year_id)
      on conflict (student_id, year_id) do update set class_id = excluded.class_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_enrollment on public.students;
create trigger sync_enrollment
  after insert or update of class_id on public.students
  for each row execute function public.sync_enrollment();

-- Backfill: every student currently placed in a class gets an enrollment
-- for the current year.
insert into public.enrollments (student_id, class_id, year_id)
select s.id, s.class_id, public.current_academic_year_id()
from public.students s
where s.class_id is not null
  and public.current_academic_year_id() is not null
on conflict (student_id, year_id) do nothing;

-- ===================== atomic year switch =====================
-- Replaces the app's two-step flag swap (clear old, set new) which could
-- fail halfway and leave no current year. Also seeds the new year's
-- enrollments from each active student's current class.
create or replace function public.set_current_academic_year(p_year_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_name text;
  v_enrolled int;
begin
  -- RLS alone can't guard this: a staff user's UPDATE would silently
  -- match 0 rows and report success, so check explicitly.
  if not public.is_admin() then
    raise exception 'Only an admin account can switch the academic year.';
  end if;

  select name into v_name from public.academic_years where id = p_year_id;
  if not found then
    raise exception 'Academic year not found.';
  end if;

  update public.academic_years set is_current = false where is_current and id <> p_year_id;
  update public.academic_years set is_current = true where id = p_year_id;

  insert into public.enrollments (student_id, class_id, year_id)
  select s.id, s.class_id, p_year_id
  from public.students s
  where s.status = 'active' and s.class_id is not null
  on conflict (student_id, year_id) do nothing;
  get diagnostics v_enrolled = row_count;

  return jsonb_build_object('name', v_name, 'enrolled', v_enrolled);
end;
$$;
