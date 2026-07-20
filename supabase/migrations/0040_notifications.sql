-- Parent notifications, provider-agnostic (audit item 11, final slice).
--
-- The data was always there — parent_mobile on every student, overdue
-- amounts one view away, absences per day — but nothing USED it. This
-- adds the notification pipeline without marrying a specific SMS
-- gateway (Hormuud, Africa's Talking, Twilio… all deliver differently):
--
--   notifications        an OUTBOX: one row per message, with the
--                        recipient number and fully rendered body
--                        snapshotted at queue time. status walks
--                        pending → sent/failed.
--   queue_fee_reminders  renders + queues one message per active
--                        student with a balance and a parent number,
--                        skipping anyone who already has a pending
--                        reminder (no double-spam).
--   queue_absence_alerts same for students marked absent on a date.
--
-- Delivery is deliberately external. Two paths work today:
--   1. the Messages page exports pending rows as CSV (recipient, body)
--      for any bulk-SMS web portal, then marks them sent — the workflow
--      most Somali schools already use;
--   2. a worker with the service role (cron, edge function) claims
--      pending rows, calls the gateway of your choice, and updates
--      status/sent_at/error. RLS never blocks the service role.
--
-- Templates travel WITH each queue call (the UI shows an editable
-- message before sending) — placeholders: {student} {class} {balance}
-- {overdue} {date} {school}.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  student_id uuid,
  kind text not null check (kind in ('fee_reminder', 'absence', 'general')),
  recipient text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  -- the date an absence alert refers to (dedupe anchor)
  ref_date date,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  -- same-school reference, structurally (0029 pattern); the message
  -- (a sent record) survives the student's row being deleted.
  constraint notifications_student_id_fkey
    foreign key (student_id, school_id) references public.students (id, school_id)
    on delete set null (student_id)
);

create index if not exists notifications_school_idx on public.notifications (school_id);
create index if not exists notifications_status_idx on public.notifications (status);
create index if not exists notifications_student_idx on public.notifications (student_id);

drop trigger if exists set_updated_at on public.notifications;
create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

-- Messaging parents is an office/money-desk function: admin, staff and
-- finance manage the outbox. Teachers and family accounts never see it
-- (it's a directory of parent phone numbers).
drop policy if exists "notifications: desk read" on public.notifications;
create policy "notifications: desk read" on public.notifications
  for select using (school_id = public.current_school_id() and public.sees_money());
drop policy if exists "notifications: desk insert" on public.notifications;
create policy "notifications: desk insert" on public.notifications
  for insert with check (school_id = public.current_school_id() and public.sees_money());
drop policy if exists "notifications: desk update" on public.notifications;
create policy "notifications: desk update" on public.notifications
  for update using (school_id = public.current_school_id() and public.sees_money())
  with check (school_id = public.current_school_id() and public.sees_money());
drop policy if exists "notifications: desk delete" on public.notifications;
create policy "notifications: desk delete" on public.notifications
  for delete using (school_id = public.current_school_id() and public.sees_money());

-- ===================== rendering helper =====================
create or replace function public.render_notification(
  p_template text,
  p_student text,
  p_class text,
  p_balance numeric,
  p_overdue numeric,
  p_date date,
  p_school text
)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(replace(p_template,
    '{student}', coalesce(p_student, '')),
    '{class}', coalesce(p_class, '')),
    '{balance}', trim(to_char(coalesce(p_balance, 0), 'FM999999990.00'))),
    '{overdue}', trim(to_char(coalesce(p_overdue, 0), 'FM999999990.00'))),
    '{date}', coalesce(to_char(p_date, 'DD Mon YYYY'), '')),
    '{school}', coalesce(p_school, ''));
$$;

-- ===================== queue_fee_reminders =====================
-- SECURITY INVOKER: the caller's own read access to balances and the
-- desk-only insert policy govern everything inside.
create or replace function public.queue_fee_reminders(p_template text default null)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school_name text;
  v_template text;
  r record;
  v_queued int := 0;
  v_no_phone int := 0;
  v_already int := 0;
begin
  if not public.sees_money() then
    raise exception 'Only office or finance accounts can send fee reminders.';
  end if;

  select name into v_school_name from public.schools limit 1;
  v_template := coalesce(nullif(trim(coalesce(p_template, '')), ''),
    'Dear parent, {student} has an outstanding school fee balance of ${balance}. '
    || 'Kindly arrange payment. — {school}');

  for r in
    select b.student_id, b.full_name, b.class_name, b.balance, b.overdue, s.parent_mobile
    from public.student_fee_balances b
    join public.students s on s.id = b.student_id
    where b.student_status = 'active' and b.balance > 0
  loop
    if r.parent_mobile is null or trim(r.parent_mobile) = '' then
      v_no_phone := v_no_phone + 1;
      continue;
    end if;
    if exists (
      select 1 from public.notifications n
      where n.student_id = r.student_id and n.kind = 'fee_reminder' and n.status = 'pending'
    ) then
      v_already := v_already + 1;
      continue;
    end if;

    insert into public.notifications (student_id, kind, recipient, body)
    values (
      r.student_id, 'fee_reminder', trim(r.parent_mobile),
      public.render_notification(v_template, r.full_name, r.class_name,
                                 r.balance, r.overdue, null, v_school_name)
    );
    v_queued := v_queued + 1;
  end loop;

  return jsonb_build_object(
    'queued', v_queued, 'no_phone', v_no_phone, 'already_pending', v_already);
end;
$$;

-- ===================== queue_absence_alerts =====================
create or replace function public.queue_absence_alerts(
  p_date date default current_date,
  p_template text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_school_name text;
  v_template text;
  r record;
  v_queued int := 0;
  v_no_phone int := 0;
  v_already int := 0;
begin
  if not public.is_office() then
    raise exception 'Only office staff can send absence alerts.';
  end if;
  if p_date is null then
    raise exception 'Pick a date.';
  end if;

  select name into v_school_name from public.schools limit 1;
  v_template := coalesce(nullif(trim(coalesce(p_template, '')), ''),
    'Dear parent, {student} was marked absent from school on {date}. '
    || 'Please contact the office if this is unexpected. — {school}');

  for r in
    select s.id as student_id, s.full_name, c.name as class_name, s.parent_mobile
    from public.attendance a
    join public.students s on s.id = a.student_id
    left join public.classes c on c.id = s.class_id
    where a.date = p_date and a.status = 'absent' and s.status = 'active'
  loop
    if r.parent_mobile is null or trim(r.parent_mobile) = '' then
      v_no_phone := v_no_phone + 1;
      continue;
    end if;
    -- one alert per student per absence day, ever (not just pending) —
    -- resending yesterday's alert is never helpful
    if exists (
      select 1 from public.notifications n
      where n.student_id = r.student_id and n.kind = 'absence' and n.ref_date = p_date
    ) then
      v_already := v_already + 1;
      continue;
    end if;

    insert into public.notifications (student_id, kind, recipient, body, ref_date)
    values (
      r.student_id, 'absence', trim(r.parent_mobile),
      public.render_notification(v_template, r.full_name, r.class_name,
                                 null, null, p_date, v_school_name),
      p_date
    );
    v_queued := v_queued + 1;
  end loop;

  return jsonb_build_object(
    'queued', v_queued, 'no_phone', v_no_phone, 'already_sent', v_already);
end;
$$;

-- ===================== restore learns about notifications =====================
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
  v_exam_scores jsonb := coalesce(p_data -> 'exam_scores', '[]'::jsonb);
  v_teacher_subjects jsonb := coalesce(p_data -> 'teacher_subjects', '[]'::jsonb);
  v_student_fees jsonb := coalesce(p_data -> 'student_fees', '[]'::jsonb);
  v_fee_installments jsonb := coalesce(p_data -> 'fee_installments', '[]'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'Only an admin account can restore from backup.';
  end if;
  v_school := public.current_school_id();
  if v_school is null then
    raise exception 'You don''t belong to a school.';
  end if;
  if p_school_id is not null and p_school_id <> v_school then
    raise exception 'This backup belongs to a different school and can''t be restored here.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'This file doesn''t contain restorable data.';
  end if;

  foreach t in array array[
    'notifications', 'receipts', 'invoices', 'exam_scores', 'attendance',
    'exams', 'fee_payments', 'expense_payments', 'expenses', 'enrollments',
    'student_fees', 'lessons', 'timetable_slots', 'teacher_subjects',
    'subjects', 'students', 'teachers', 'classes', 'departments'
  ] loop
    execute format('delete from public.%I where school_id = $1', t) using v_school;
  end loop;

  if jsonb_array_length(v_years) > 0 then
    delete from public.academic_years where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('academic_years', public.restore_insert_rows('academic_years', v_years));
  end if;

  if jsonb_array_length(v_fee_installments) > 0 then
    delete from public.fee_installments where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('fee_installments', public.restore_insert_rows('fee_installments', v_fee_installments));
  end if;

  v_counts := v_counts
    || jsonb_build_object('departments', public.restore_insert_rows('departments', p_data -> 'departments'))
    || jsonb_build_object('timetable_slots', public.restore_insert_rows('timetable_slots', p_data -> 'timetable_slots'));

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
    || jsonb_build_object('lessons', public.restore_insert_rows('lessons', p_data -> 'lessons'))
    || jsonb_build_object('students', public.restore_insert_rows('students', p_data -> 'students'))
    || jsonb_build_object('attendance', public.restore_insert_rows('attendance', p_data -> 'attendance'))
    || jsonb_build_object('exams', public.restore_insert_rows('exams', p_data -> 'exams'));

  if jsonb_array_length(v_exam_scores) > 0 then
    v_counts := v_counts
      || jsonb_build_object('exam_scores', public.restore_insert_rows('exam_scores', v_exam_scores));
  else
    v_counts := v_counts
      || jsonb_build_object('exam_scores', public.backfill_exam_scores(v_school));
  end if;

  if jsonb_array_length(v_teacher_subjects) > 0 then
    v_counts := v_counts
      || jsonb_build_object('teacher_subjects', public.restore_insert_rows('teacher_subjects', v_teacher_subjects));
  else
    v_counts := v_counts
      || jsonb_build_object('teacher_subjects', public.backfill_teacher_subjects(v_school));
  end if;

  -- created_by references auth.users; a backup can be older than the
  -- accounts it names, so the column is re-stamped as the restorer.
  v_counts := v_counts
    || jsonb_build_object('notifications',
         public.restore_insert_rows('notifications', p_data -> 'notifications', array['created_by']));

  v_counts := v_counts
    || jsonb_build_object('fee_payments', public.restore_insert_rows('fee_payments', p_data -> 'fee_payments'))
    || jsonb_build_object('expenses', public.restore_insert_rows('expenses', p_data -> 'expenses'));

  if jsonb_array_length(v_student_fees) > 0 then
    delete from public.student_fees where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('student_fees', public.restore_insert_rows('student_fees', v_student_fees));
  else
    v_counts := v_counts
      || jsonb_build_object('student_fees', public.backfill_student_fees(v_school));
  end if;

  if jsonb_array_length(v_expense_payments) > 0 then
    v_counts := v_counts
      || jsonb_build_object('expense_payments', public.restore_insert_rows('expense_payments', v_expense_payments));
  else
    insert into public.expense_payments (expense_id, school_id, amount, method, note, paid_at)
    select e.id, e.school_id, e.paid, e.method,
           'Opening balance (restored from a backup without payment history)', e.date::timestamptz
    from public.expenses e
    where e.school_id = v_school and e.paid > 0;
  end if;

  v_counts := v_counts
    || jsonb_build_object('invoices', public.restore_insert_rows('invoices', p_data -> 'invoices'))
    || jsonb_build_object('receipts', public.restore_insert_rows('receipts', p_data -> 'receipts'));

  if jsonb_array_length(v_enrollments) > 0 then
    delete from public.enrollments where school_id = v_school;
    v_counts := v_counts
      || jsonb_build_object('enrollments', public.restore_insert_rows('enrollments', v_enrollments));
  end if;

  return v_counts;
end;
$$;

-- notifications joins the restore allowlist
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
    'academic_years', 'fee_installments', 'departments', 'classes',
    'teachers', 'subjects', 'teacher_subjects', 'timetable_slots',
    'lessons', 'students', 'student_fees', 'attendance', 'exams',
    'exam_scores', 'fee_payments', 'expenses', 'expense_payments',
    'invoices', 'receipts', 'enrollments', 'notifications'
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
