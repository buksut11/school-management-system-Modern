-- updated_at on every mutable table (from schema review).
--
-- Every table recorded created_at but nothing recorded when a row last
-- changed. Without it there's no way to see that a student's record was
-- edited after enrollment, no signal for "two staff edited the same row"
-- conflict detection, and no anchor for incremental sync or debugging
-- ("when did this fee amount change?"). A single trigger keeps the column
-- honest — the app never has to remember to set it.
--
-- activity_log is left out on purpose: it's append-only.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'classes', 'teachers', 'students', 'attendance',
    'departments', 'subjects', 'exams', 'fee_payments', 'expenses',
    'invoices', 'receipts', 'academic_years'
  ] loop
    execute format(
      'alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;
