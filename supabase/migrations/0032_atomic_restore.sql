-- Atomic backup restore (audit finding 2.2).
--
-- restoreFromBackup wiped 12 tables and re-inserted them through dozens
-- of separate REST calls. Any failure partway — network, a constraint,
-- an RLS block — left the school half-wiped with no way back. The whole
-- wipe-and-reload now runs inside ONE database transaction: any error
-- rolls the entire restore back and the school's data is untouched.
--
-- Both functions are SECURITY INVOKER: every delete and insert is still
-- subject to the caller's own RLS, exactly like the old app-side flow —
-- the database's admin/finance write rules keep applying inside.
--
-- The app-side change that pairs with this migration stamps the REAL
-- school id and name into each snapshot (the old code hard-coded one
-- school's name, so any school's file passed any other school's check).

-- ===================== per-table insert helper =====================
-- Inserts snapshot rows into one table. The column list is the keys the
-- snapshot actually carries ∩ the table's real columns, minus seq
-- (GENERATED ALWAYS — Postgres rejects explicit values), school_id
-- (always re-stamped with the caller's school so a foreign snapshot
-- can't smuggle rows into another tenant) and any per-call exclusions.
-- Columns absent from the snapshot fall back to their defaults — that's
-- what lets pre-0014 backups (no year_id) land on the current year.
create or replace function public.restore_insert_rows(
  p_table text,
  p_rows jsonb,
  p_exclude text[] default '{}'
)
returns int
language plpgsql
set search_path = public
as $$
declare
  v_cols text;
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can restore from backup.';
  end if;
  if p_table <> all (array[
    'academic_years', 'departments', 'classes', 'teachers', 'subjects',
    'students', 'attendance', 'exams', 'fee_payments', 'expenses',
    'expense_payments', 'invoices', 'receipts', 'enrollments'
  ]) then
    raise exception 'Table % cannot be restored.', p_table;
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  select string_agg(quote_ident(c.column_name), ', ')
  into v_cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = p_table
    and c.column_name in (select jsonb_object_keys(p_rows -> 0))
    and c.column_name <> all (array['seq', 'school_id'] || p_exclude);

  if v_cols is null then
    raise exception 'Snapshot rows for % carry no recognizable columns.', p_table;
  end if;

  execute format(
    'insert into public.%I (%s, school_id)
     select %s, public.current_school_id()
     from jsonb_populate_recordset(null::public.%I, $1)',
    p_table, v_cols, v_cols, p_table
  ) using p_rows;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ===================== the restore =====================
create or replace function public.restore_school_snapshot(
  p_data jsonb,
  p_school_id uuid default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  t text;
  v_school uuid;
  v_counts jsonb := '{}'::jsonb;
  v_years jsonb := coalesce(p_data -> 'academic_years', '[]'::jsonb);
  v_classes jsonb := coalesce(p_data -> 'classes', '[]'::jsonb);
  v_enrollments jsonb := coalesce(p_data -> 'enrollments', '[]'::jsonb);
  v_expense_payments jsonb := coalesce(p_data -> 'expense_payments', '[]'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can restore from backup.';
  end if;
  v_school := public.current_school_id();
  if v_school is null then
    raise exception 'You don''t belong to a school.';
  end if;
  -- Snapshots taken since this migration carry their school of origin;
  -- restoring another school's file is almost always an accident.
  if p_school_id is not null and p_school_id <> v_school then
    raise exception 'This backup belongs to a different school and can''t be restored here.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'This file doesn''t contain restorable data.';
  end if;

  -- Wipe children before parents so foreign keys never dangle. Every
  -- delete is scoped to this school (and RLS-checked besides).
  foreach t in array array[
    'receipts', 'invoices', 'attendance', 'exams', 'fee_payments',
    'expense_payments', 'expenses', 'enrollments', 'subjects',
    'students', 'teachers', 'classes', 'departments'
  ] loop
    execute format('delete from public.%I where school_id = $1', t) using v_school;
  end loop;

  -- Years are only replaced when the snapshot carries them. Older
  -- backups don't — their exams/fee rows have no year_id and fall back
  -- to the current year via the column default, which needs the
  -- existing years left in place.
  if jsonb_array_length(v_years) > 0 then
    delete from public.academic_years where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('academic_years', public.restore_insert_rows('academic_years', v_years));
  end if;

  v_counts := v_counts
    || jsonb_build_object('departments', public.restore_insert_rows('departments', p_data -> 'departments'));

  -- Classes and teachers reference each other: classes go in with
  -- teacher_id withheld, then get patched once teachers exist.
  v_counts := v_counts
    || jsonb_build_object('classes', public.restore_insert_rows('classes', v_classes, array['teacher_id']));
  v_counts := v_counts
    || jsonb_build_object('teachers', public.restore_insert_rows('teachers', p_data -> 'teachers'));
  update public.classes c
  set teacher_id = x.teacher_id
  from jsonb_to_recordset(v_classes) as x(id uuid, teacher_id uuid)
  where c.id = x.id and c.school_id = v_school and x.teacher_id is not null;

  v_counts := v_counts
    || jsonb_build_object('subjects', public.restore_insert_rows('subjects', p_data -> 'subjects'))
    || jsonb_build_object('students', public.restore_insert_rows('students', p_data -> 'students'))
    || jsonb_build_object('attendance', public.restore_insert_rows('attendance', p_data -> 'attendance'))
    || jsonb_build_object('exams', public.restore_insert_rows('exams', p_data -> 'exams'))
    || jsonb_build_object('fee_payments', public.restore_insert_rows('fee_payments', p_data -> 'fee_payments'))
    || jsonb_build_object('expenses', public.restore_insert_rows('expenses', p_data -> 'expenses'));

  if jsonb_array_length(v_expense_payments) > 0 then
    v_counts := v_counts
      || jsonb_build_object('expense_payments', public.restore_insert_rows('expense_payments', v_expense_payments));
  else
    -- Pre-0031 snapshot: synthesize opening ledger rows so payment
    -- history matches the restored paid totals.
    insert into public.expense_payments (expense_id, school_id, amount, method, note, paid_at)
    select e.id, e.school_id, e.paid, e.method,
           'Opening balance (restored from a backup without payment history)', e.date::timestamptz
    from public.expenses e
    where e.school_id = v_school and e.paid > 0;
  end if;

  v_counts := v_counts
    || jsonb_build_object('invoices', public.restore_insert_rows('invoices', p_data -> 'invoices'))
    || jsonb_build_object('receipts', public.restore_insert_rows('receipts', p_data -> 'receipts'));

  -- Restoring students just re-created current-year enrollments via the
  -- sync trigger — clear those so the snapshot's own history (which
  -- includes them, plus prior years) lands without unique conflicts.
  if jsonb_array_length(v_enrollments) > 0 then
    delete from public.enrollments where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('enrollments', public.restore_insert_rows('enrollments', v_enrollments));
  end if;

  return v_counts;
end;
$$;
