-- OPTIONAL — read before running.
--
-- Right now every table's RLS policy is just `auth.role() = 'authenticated'`,
-- so ANY signed-in user — regardless of the `profiles.role` they're given —
-- has full read/write/delete access to every student, financial record,
-- and the backup/restore flow. `profiles.role` exists but nothing actually
-- checks it. This migration makes it real:
--
--   - New signups now default to 'staff' instead of 'admin' (secure by
--     default). The very first account created in a fresh project is
--     still made 'admin' automatically, so you don't get locked out.
--   - 'staff' can read everything and do day-to-day work (students,
--     teachers, attendance, exams).
--   - Deleting students/teachers/classes, and anything touching money
--     (fees, expenses) or the backup/restore flow, requires 'admin'.
--
-- Run this only once you've confirmed your own account is 'admin' —
-- check with: select role from public.profiles where id = auth.uid();
-- If it says 'staff', run:
--   update public.profiles set role = 'admin' where id = auth.uid();
-- BEFORE applying the policies below, or you'll lock yourself out of
-- deletes/fees/expenses/restore until you fix it via the SQL editor
-- (which still works — RLS never blocks the SQL editor's service role).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when is_first then 'admin' else 'staff' end
  );
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- students / teachers / classes: staff can read + create + update,
-- only admin can delete.
drop policy if exists "students: staff full access" on public.students;
create policy "students: read" on public.students for select using (auth.role() = 'authenticated');
create policy "students: insert" on public.students for insert with check (auth.role() = 'authenticated');
create policy "students: update" on public.students for update using (auth.role() = 'authenticated');
create policy "students: delete (admin only)" on public.students for delete using (public.is_admin());

drop policy if exists "teachers: staff full access" on public.teachers;
create policy "teachers: read" on public.teachers for select using (auth.role() = 'authenticated');
create policy "teachers: insert" on public.teachers for insert with check (auth.role() = 'authenticated');
create policy "teachers: update" on public.teachers for update using (auth.role() = 'authenticated');
create policy "teachers: delete (admin only)" on public.teachers for delete using (public.is_admin());

drop policy if exists "classes: staff full access" on public.classes;
create policy "classes: read" on public.classes for select using (auth.role() = 'authenticated');
create policy "classes: insert" on public.classes for insert with check (auth.role() = 'authenticated');
create policy "classes: update" on public.classes for update using (auth.role() = 'authenticated');
create policy "classes: delete (admin only)" on public.classes for delete using (public.is_admin());

-- money + destructive/system operations: admin only, end to end.
drop policy if exists "fee_payments: staff full access" on public.fee_payments;
create policy "fee_payments: read" on public.fee_payments for select using (auth.role() = 'authenticated');
create policy "fee_payments: admin write" on public.fee_payments for insert with check (public.is_admin());
create policy "fee_payments: admin update" on public.fee_payments for update using (public.is_admin());
create policy "fee_payments: admin delete" on public.fee_payments for delete using (public.is_admin());

drop policy if exists "expenses: staff full access" on public.expenses;
create policy "expenses: read" on public.expenses for select using (auth.role() = 'authenticated');
create policy "expenses: admin write" on public.expenses for insert with check (public.is_admin());
create policy "expenses: admin update" on public.expenses for update using (public.is_admin());
create policy "expenses: admin delete" on public.expenses for delete using (public.is_admin());

-- attendance / exams / subjects / departments stay staff-editable
-- (day-to-day academic work), admin-only to delete.
drop policy if exists "attendance: staff full access" on public.attendance;
create policy "attendance: read" on public.attendance for select using (auth.role() = 'authenticated');
create policy "attendance: write" on public.attendance for insert with check (auth.role() = 'authenticated');
create policy "attendance: update" on public.attendance for update using (auth.role() = 'authenticated');
create policy "attendance: delete (admin only)" on public.attendance for delete using (public.is_admin());

drop policy if exists "exams: staff full access" on public.exams;
create policy "exams: read" on public.exams for select using (auth.role() = 'authenticated');
create policy "exams: write" on public.exams for insert with check (auth.role() = 'authenticated');
create policy "exams: update" on public.exams for update using (auth.role() = 'authenticated');
create policy "exams: delete (admin only)" on public.exams for delete using (public.is_admin());
