-- Behavior tests for the schema's security and integrity guarantees.
-- Run against a database prepared with supabase_stub.sql + all
-- migrations (see tests/README.md). Every test raises an exception on
-- failure, so with ON_ERROR_STOP the suite is binary: it either prints
-- all PASS lines and finishes, or it dies at the first break.
--
-- Impersonation works the way PostgREST does it: SET ROLE authenticated
-- plus the request.jwt.claims GUC that auth.uid()/auth.role() read.

\set ON_ERROR_STOP on

-- ===================== helpers =====================
create or replace function test_login(p_uid uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, false)::void;
$$;

create or replace procedure must_fail(p_name text, p_sql text)
language plpgsql as $$
begin
  begin
    execute p_sql;
    raise exception 'TEST FAIL: % — succeeded but should have been rejected', p_name;
  exception
    when others then
      if sqlerrm like 'TEST FAIL%' then raise; end if;
      raise notice 'PASS: %', p_name;
  end;
end;
$$;

create or replace procedure must_equal(p_name text, p_sql text, p_expected text)
language plpgsql as $$
declare v text;
begin
  execute p_sql into v;
  if v is distinct from p_expected then
    raise exception 'TEST FAIL: % — expected [%], got [%]', p_name, p_expected, v;
  end if;
  raise notice 'PASS: %', p_name;
end;
$$;

-- ===================== fixtures: two schools =====================
-- Service context (no JWT): direct setup, the way the platform owner or
-- a seed script would provision.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin.a@test', '{"full_name":"Admin A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'admin.b@test', '{"full_name":"Admin B"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'staff.a@test', '{"full_name":"Staff A"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'parent.a@test', '{"full_name":"Parent A"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'second.a@test', '{"full_name":"Second Joiner"}');

insert into public.schools (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'School A'),
  ('22222222-2222-2222-2222-222222222222', 'School B');

update public.profiles set school_id = '11111111-1111-1111-1111-111111111111', role = 'admin'
  where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set school_id = '22222222-2222-2222-2222-222222222222', role = 'admin'
  where id = '00000000-0000-0000-0000-00000000000b';
update public.profiles set school_id = '11111111-1111-1111-1111-111111111111', role = 'staff'
  where id = '00000000-0000-0000-0000-0000000000c1';

insert into public.academic_years (id, school_id, name, is_current) values
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-2027', true),
  ('bbbb2222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '2026-2027', true);

insert into public.classes (id, school_id, name, base_fees) values
  ('aaaa1111-0000-0000-0000-00000000c1a1', '11111111-1111-1111-1111-111111111111', 'Form 1A', 100),
  ('bbbb2222-0000-0000-0000-00000000c1b1', '22222222-2222-2222-2222-222222222222', 'Form 1B', 100);

insert into public.students (id, school_id, full_name, class_id, base_fees) values
  ('aaaa1111-0000-0000-0000-0000000005a1', '11111111-1111-1111-1111-111111111111', 'Student A1',
   'aaaa1111-0000-0000-0000-00000000c1a1', 100),
  ('bbbb2222-0000-0000-0000-0000000005b1', '22222222-2222-2222-2222-222222222222', 'Student B1',
   'bbbb2222-0000-0000-0000-00000000c1b1', 100);

insert into public.subjects (id, school_id, name) values
  ('bbbb2222-0000-0000-0000-0000000000b5', '22222222-2222-2222-2222-222222222222', 'History B');

insert into public.teachers (id, school_id, full_name) values
  ('aaaa1111-0000-0000-0000-0000000007a1', '11111111-1111-1111-1111-111111111111', 'Teacher A1');

-- Avatar objects for both schools (service context, as the storage API
-- would have written them).
insert into storage.objects (bucket_id, name) values
  ('avatars', '11111111-1111-1111-1111-111111111111/students/photo-a.jpg'),
  ('avatars', '22222222-2222-2222-2222-222222222222/students/photo-b.jpg');

-- ===================== as Admin A =====================
select test_login('00000000-0000-0000-0000-00000000000a');
set role authenticated;

-- ---- tenant isolation sanity ----
call must_equal('RLS hides school B students from school A',
  $q$ select count(*)::text from public.students $q$, '1');

-- ---- 0034: private avatars ----
call must_equal('avatars bucket is private',
  $q$ select public::text from storage.buckets where id = 'avatars' $q$, 'false');
call must_equal('members see only their own school''s photo objects',
  $q$ select count(*)::text from storage.objects where bucket_id = 'avatars' $q$, '1');
call must_equal('the visible photo object belongs to the member''s school',
  $q$ select (storage.foldername(name))[1] from storage.objects where bucket_id = 'avatars' $q$,
  '11111111-1111-1111-1111-111111111111');

-- ---- 0026: activity log actor stamping ----
insert into public.activity_log (kind, message, actor_id, actor_name)
values ('test', 'forged entry', '00000000-0000-0000-0000-00000000000b', 'Forged Head Teacher');
call must_equal('activity log stamps the real actor id',
  $q$ select actor_id::text from public.activity_log where message = 'forged entry' $q$,
  '00000000-0000-0000-0000-00000000000a');
call must_equal('activity log stamps the real actor name',
  $q$ select actor_name from public.activity_log where message = 'forged entry' $q$,
  'Admin A');

-- ---- 0028: per-school subject names ----
insert into public.subjects (name) values ('Maths');
call must_fail('duplicate subject name in the same school is rejected (case-insensitive)',
  $q$ insert into public.subjects (name) values ('maths') $q$);

-- ---- 0029: cross-tenant references ----
call must_fail('attendance cannot reference another school''s student',
  $q$ insert into public.attendance (student_id, date)
      values ('bbbb2222-0000-0000-0000-0000000005b1', current_date) $q$);
call must_fail('fee payment cannot reference another school''s student',
  $q$ insert into public.fee_payments (student_id, amount)
      values ('bbbb2222-0000-0000-0000-0000000005b1', 10) $q$);
call must_fail('exam cannot reference another school''s class',
  $q$ insert into public.exams (student_id, class_id)
      values ('aaaa1111-0000-0000-0000-0000000005a1', 'bbbb2222-0000-0000-0000-00000000c1b1') $q$);
insert into public.attendance (student_id, class_id, date)
values ('aaaa1111-0000-0000-0000-0000000005a1', 'aaaa1111-0000-0000-0000-00000000c1a1', current_date);

-- ---- 0033: exam score bounds ----
call must_fail('subject score above 100 is rejected',
  $q$ insert into public.exams (student_id, class_id, subject_scores, total_score)
      values ('aaaa1111-0000-0000-0000-0000000005a1', 'aaaa1111-0000-0000-0000-00000000c1a1',
              '{"Maths": 850}'::jsonb, 850) $q$);
call must_fail('total_score above the possible maximum is rejected',
  $q$ insert into public.exams (student_id, class_id, subject_scores, total_score)
      values ('aaaa1111-0000-0000-0000-0000000005a1', 'aaaa1111-0000-0000-0000-00000000c1a1',
              '{"Maths": 90}'::jsonb, 5000) $q$);
insert into public.exams (student_id, class_id, term, subject_scores, test_score, total_score, grade)
values ('aaaa1111-0000-0000-0000-0000000005a1', 'aaaa1111-0000-0000-0000-00000000c1a1',
        'Term 1', '{"Maths": 90}'::jsonb, 80, 170, 'A');

-- ---- 0035: relational gradebook via save_exam ----
select public.save_exam(
  'aaaa1111-0000-0000-0000-0000000005a1', 'Term 2',
  jsonb_build_object((select id from public.subjects where name = 'Maths')::text, 90),
  p_class_id => 'aaaa1111-0000-0000-0000-00000000c1a1',
  p_test_score => 80);
call must_equal('save_exam computed the total in the database',
  $q$ select (total_score = 170)::text from public.exams where term = 'Term 2' $q$, 'true');
call must_equal('save_exam computed the grade in the database',
  $q$ select grade from public.exams where term = 'Term 2' $q$, 'A');
call must_equal('save_exam wrote the relational score rows',
  $q$ select count(*)::text from public.exam_scores $q$, '1');
call must_equal('save_exam maintains the name-keyed snapshot',
  $q$ select (subject_scores ->> 'Maths') from public.exams where term = 'Term 2' $q$, '90');

call must_fail('save_exam rejects a subject score above 100',
  $q$ select public.save_exam('aaaa1111-0000-0000-0000-0000000005a1', 'Term 3',
      jsonb_build_object((select id from public.subjects where name = 'Maths')::text, 850)) $q$);
call must_fail('save_exam rejects another school''s subject',
  $q$ select public.save_exam('aaaa1111-0000-0000-0000-0000000005a1', 'Term 3',
      jsonb_build_object('bbbb2222-0000-0000-0000-0000000000b5', 50)) $q$);
call must_fail('save_exam rejects a malformed subject id',
  $q$ select public.save_exam('aaaa1111-0000-0000-0000-0000000005a1', 'Term 3',
      '{"not-a-uuid": 50}'::jsonb) $q$);
call must_fail('save_exam rejects a duplicate term record',
  $q$ select public.save_exam('aaaa1111-0000-0000-0000-0000000005a1', 'Term 2',
      '{}'::jsonb) $q$);

-- editing replaces the scores and recomputes total + grade
select public.save_exam(
  'aaaa1111-0000-0000-0000-0000000005a1', 'Term 2',
  jsonb_build_object((select id from public.subjects where name = 'Maths')::text, 40),
  p_exam_id => (select id from public.exams where term = 'Term 2'),
  p_class_id => 'aaaa1111-0000-0000-0000-00000000c1a1',
  p_test_score => 10);
call must_equal('editing an exam replaces its score rows',
  $q$ select (score = 40)::text from public.exam_scores $q$, 'true');
call must_equal('editing an exam recomputes the grade',
  $q$ select grade from public.exams where term = 'Term 2' $q$, 'F');

-- ---- 0036: teacher ↔ subject relation ----
select public.set_teacher_subjects('aaaa1111-0000-0000-0000-0000000007a1',
  array[(select id from public.subjects where name = 'Maths')]);
call must_equal('set_teacher_subjects links the subject',
  $q$ select count(*)::text from public.teacher_subjects
      where teacher_id = 'aaaa1111-0000-0000-0000-0000000007a1' $q$, '1');
call must_equal('the teachers.subjects snapshot follows the links',
  $q$ select array_to_string(subjects, ',') from public.teachers
      where id = 'aaaa1111-0000-0000-0000-0000000007a1' $q$, 'Maths');

call must_fail('set_teacher_subjects rejects another school''s subject',
  $q$ select public.set_teacher_subjects('aaaa1111-0000-0000-0000-0000000007a1',
      array['bbbb2222-0000-0000-0000-0000000000b5'::uuid]) $q$);
call must_fail('set_teacher_subjects rejects a teacher outside the school',
  $q$ select public.set_teacher_subjects('99999999-9999-9999-9999-999999999999',
      array[(select id from public.subjects where name = 'Maths')]) $q$);

insert into public.subjects (name) values ('Art');
select public.set_teacher_subjects('aaaa1111-0000-0000-0000-0000000007a1',
  array[(select id from public.subjects where name = 'Maths'),
        (select id from public.subjects where name = 'Art')]);
call must_equal('set_teacher_subjects replaces the whole set',
  $q$ select count(*)::text from public.teacher_subjects
      where teacher_id = 'aaaa1111-0000-0000-0000-0000000007a1' $q$, '2');

-- deleting a subject cascades out of the links AND refreshes the snapshot
delete from public.subjects where name = 'Art';
call must_equal('deleting a subject refreshes the teachers.subjects snapshot',
  $q$ select array_to_string(subjects, ',') from public.teachers
      where id = 'aaaa1111-0000-0000-0000-0000000007a1' $q$, 'Maths');

-- ---- 0013/0014: fee overpayment guard still holds ----
select public.record_fee_payment('aaaa1111-0000-0000-0000-0000000005a1', 60);
call must_fail('fee payment beyond the outstanding balance is rejected',
  $q$ select public.record_fee_payment('aaaa1111-0000-0000-0000-0000000005a1', 50) $q$);
call must_equal('fee payment issued its receipt',
  $q$ select count(*)::text from public.receipts where party_id = 'aaaa1111-0000-0000-0000-0000000005a1' $q$,
  '1');

-- ---- 0030: invoice overpayment guard ----
insert into public.invoices (id, party_type, party_name, items, total)
values ('aaaa1111-0000-0000-0000-0000000009a1', 'staff', 'Cleaner Casey',
        '[{"description":"March wages","qty":1,"unit_price":100}]'::jsonb, 100);
select public.record_invoice_payment('aaaa1111-0000-0000-0000-0000000009a1', 60);
call must_fail('invoice payment beyond the balance is rejected',
  $q$ select public.record_invoice_payment('aaaa1111-0000-0000-0000-0000000009a1', 50) $q$);
select public.record_invoice_payment('aaaa1111-0000-0000-0000-0000000009a1', 40);
call must_fail('paying an already-settled invoice is rejected',
  $q$ select public.record_invoice_payment('aaaa1111-0000-0000-0000-0000000009a1', 1) $q$);

-- ---- 0031: expense payment ledger ----
insert into public.expenses (id, payee, category, amount)
values ('aaaa1111-0000-0000-0000-000000000ea1', 'Teaching payroll', 'salaries', 100);
select public.record_expense_payment('aaaa1111-0000-0000-0000-000000000ea1', 60);
call must_fail('expense payment beyond the outstanding amount is rejected',
  $q$ select public.record_expense_payment('aaaa1111-0000-0000-0000-000000000ea1', 50) $q$);
select public.record_expense_payment('aaaa1111-0000-0000-0000-000000000ea1', 40);
call must_equal('expenses.paid tracks the ledger total',
  $q$ select paid::text from public.expenses where id = 'aaaa1111-0000-0000-0000-000000000ea1' $q$,
  '100.00');
call must_equal('each expense payment left a ledger row',
  $q$ select count(*)::text from public.expense_payments
      where expense_id = 'aaaa1111-0000-0000-0000-000000000ea1' $q$,
  '2');
call must_equal('salary payments issue staff receipts',
  $q$ select count(*)::text from public.receipts
      where party_detail = 'Salary' and party_name = 'Teaching payroll' $q$,
  '2');

-- ---- 0027: single-use invites + member offboarding ----
create temp table t_invite as
select (public.create_invite('parent', null, null,
        array['aaaa1111-0000-0000-0000-0000000005a1'::uuid]) ->> 'code') as code;

reset role;
select test_login('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
select public.join_school((select code from t_invite));
call must_equal('invite joiner landed as parent with the child linked',
  $q$ select count(*)::text from public.profile_students
      where profile_id = '00000000-0000-0000-0000-0000000000d1' $q$,
  '1');

reset role;
select test_login('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
call must_fail('a used invite cannot be redeemed again',
  $q$ select public.join_school((select code from t_invite)) $q$);

reset role;
select test_login('00000000-0000-0000-0000-00000000000a');
set role authenticated;
select public.remove_member('00000000-0000-0000-0000-0000000000d1');
reset role;
call must_equal('removing a member clears their family links',
  $q$ select count(*)::text from public.profile_students
      where profile_id = '00000000-0000-0000-0000-0000000000d1' $q$,
  '0');
call must_equal('removing a member detaches them from the school',
  $q$ select coalesce(school_id::text, 'none') from public.profiles
      where id = '00000000-0000-0000-0000-0000000000d1' $q$,
  'none');

-- ---- 0023: staff cannot see or write expenses ----
select test_login('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
call must_equal('staff cannot read expenses (salaries stay private)',
  $q$ select count(*)::text from public.expenses $q$, '0');
call must_fail('staff cannot record expenses',
  $q$ insert into public.expenses (payee, amount) values ('Sneaky', 5) $q$);

-- ===================== 0032: atomic restore =====================
reset role;
select test_login('00000000-0000-0000-0000-00000000000a');
set role authenticated;

-- Snapshot school A exactly the way the app does (select * per table,
-- under the caller's RLS).
create temp table t_snap as
select jsonb_build_object(
  'academic_years', coalesce((select jsonb_agg(to_jsonb(x)) from public.academic_years x), '[]'::jsonb),
  'departments',    coalesce((select jsonb_agg(to_jsonb(x)) from public.departments x), '[]'::jsonb),
  'classes',        coalesce((select jsonb_agg(to_jsonb(x)) from public.classes x), '[]'::jsonb),
  'teachers',       coalesce((select jsonb_agg(to_jsonb(x)) from public.teachers x), '[]'::jsonb),
  'subjects',       coalesce((select jsonb_agg(to_jsonb(x)) from public.subjects x), '[]'::jsonb),
  'teacher_subjects', coalesce((select jsonb_agg(to_jsonb(x)) from public.teacher_subjects x), '[]'::jsonb),
  'students',       coalesce((select jsonb_agg(to_jsonb(x)) from public.students x), '[]'::jsonb),
  'attendance',     coalesce((select jsonb_agg(to_jsonb(x)) from public.attendance x), '[]'::jsonb),
  'exams',          coalesce((select jsonb_agg(to_jsonb(x)) from public.exams x), '[]'::jsonb),
  'exam_scores',    coalesce((select jsonb_agg(to_jsonb(x)) from public.exam_scores x), '[]'::jsonb),
  'fee_payments',   coalesce((select jsonb_agg(to_jsonb(x)) from public.fee_payments x), '[]'::jsonb),
  'expenses',       coalesce((select jsonb_agg(to_jsonb(x)) from public.expenses x), '[]'::jsonb),
  'expense_payments', coalesce((select jsonb_agg(to_jsonb(x)) from public.expense_payments x), '[]'::jsonb),
  'invoices',       coalesce((select jsonb_agg(to_jsonb(x)) from public.invoices x), '[]'::jsonb),
  'receipts',       coalesce((select jsonb_agg(to_jsonb(x)) from public.receipts x), '[]'::jsonb),
  'enrollments',    coalesce((select jsonb_agg(to_jsonb(x)) from public.enrollments x), '[]'::jsonb)
) as data;

call must_fail('a backup stamped with a different school is rejected',
  $q$ select public.restore_school_snapshot((select data from t_snap),
      '22222222-2222-2222-2222-222222222222') $q$);

-- A snapshot with one poisoned row must roll back COMPLETELY: the wipe
-- happens in the same transaction, so nothing may be lost.
create temp table t_bad as
select (select data from t_snap) || jsonb_build_object(
  'exams', jsonb_build_array(jsonb_build_object(
    'student_id', '99999999-9999-9999-9999-999999999999', 'term', 'Term 1'))
) as data;
call must_fail('a broken snapshot fails the restore',
  $q$ select public.restore_school_snapshot((select data from t_bad),
      '11111111-1111-1111-1111-111111111111') $q$);
call must_equal('failed restore rolled everything back — students intact',
  $q$ select count(*)::text from public.students $q$, '1');
call must_equal('failed restore rolled everything back — payments intact',
  $q$ select count(*)::text from public.fee_payments $q$, '1');

-- Happy path: wipe + reload lands identical data.
select public.restore_school_snapshot((select data from t_snap),
  '11111111-1111-1111-1111-111111111111');
call must_equal('restore round-trip: students', $q$ select count(*)::text from public.students $q$, '1');
call must_equal('restore round-trip: attendance', $q$ select count(*)::text from public.attendance $q$, '1');
call must_equal('restore round-trip: exams', $q$ select count(*)::text from public.exams $q$, '2');
call must_equal('restore round-trip: exam scores', $q$ select count(*)::text from public.exam_scores $q$, '1');
call must_equal('restore round-trip: teacher subjects', $q$ select count(*)::text from public.teacher_subjects $q$, '1');
call must_equal('restore round-trip: fee payments', $q$ select count(*)::text from public.fee_payments $q$, '1');
call must_equal('restore round-trip: expense ledger', $q$ select count(*)::text from public.expense_payments $q$, '2');
call must_equal('restore round-trip: enrollments', $q$ select count(*)::text from public.enrollments $q$, '1');
call must_equal('restore round-trip: class kept its teacher pointer',
  $q$ select count(*)::text from public.classes where name = 'Form 1A' $q$, '1');

-- School B was never touched.
reset role;
select test_login('00000000-0000-0000-0000-00000000000b');
set role authenticated;
call must_equal('school B untouched by school A''s restore',
  $q$ select full_name from public.students $q$, 'Student B1');

reset role;
\echo ''
\echo 'ALL TESTS PASSED'
