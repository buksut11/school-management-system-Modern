-- Cross-tenant reference enforcement (audit finding 1.1).
--
-- Every child table referenced its parent by plain id. RLS proves the
-- ROW being written belongs to the caller's school, but nothing proved
-- the row it POINTS AT does: a member who obtained another school's
-- student UUID could insert an exam, attendance row or fee payment
-- referencing that student. The database now enforces same-school
-- references structurally: parents expose unique (id, school_id), and
-- children reference (fk, school_id) pairs, so a reference can only ever
-- land inside the row's own school.
--
-- ON DELETE semantics are preserved exactly; nullable FKs use the
-- PG15+ column list form (`on delete set null (col)`) so school_id —
-- which is NOT NULL — is never nulled by the action. Constraints are
-- added NOT VALID (the 0016 pattern) so the migration succeeds even if
-- a hosted database already contains a bad row; validate each with
--   alter table public.<t> validate constraint <name>;
-- once you've confirmed the data is clean.

-- ===================== parent keys =====================
do $$
declare
  t text;
begin
  foreach t in array array['students', 'teachers', 'classes', 'departments', 'academic_years', 'expenses'] loop
    if not exists (
      select 1 from pg_constraint
      where conname = t || '_id_school_key' and conrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I unique (id, school_id)',
        t, t || '_id_school_key');
    end if;
  end loop;
end;
$$;

-- ===================== attendance =====================
alter table public.attendance drop constraint if exists attendance_student_id_fkey;
alter table public.attendance add constraint attendance_student_id_fkey
  foreign key (student_id, school_id) references public.students (id, school_id)
  on delete cascade not valid;

alter table public.attendance drop constraint if exists attendance_class_id_fkey;
alter table public.attendance add constraint attendance_class_id_fkey
  foreign key (class_id, school_id) references public.classes (id, school_id)
  on delete set null (class_id) not valid;

-- ===================== exams =====================
alter table public.exams drop constraint if exists exams_student_id_fkey;
alter table public.exams add constraint exams_student_id_fkey
  foreign key (student_id, school_id) references public.students (id, school_id)
  on delete cascade not valid;

alter table public.exams drop constraint if exists exams_class_id_fkey;
alter table public.exams add constraint exams_class_id_fkey
  foreign key (class_id, school_id) references public.classes (id, school_id)
  on delete set null (class_id) not valid;

alter table public.exams drop constraint if exists exams_year_id_fkey;
alter table public.exams add constraint exams_year_id_fkey
  foreign key (year_id, school_id) references public.academic_years (id, school_id)
  on delete restrict not valid;

-- ===================== fee_payments =====================
alter table public.fee_payments drop constraint if exists fee_payments_student_id_fkey;
alter table public.fee_payments add constraint fee_payments_student_id_fkey
  foreign key (student_id, school_id) references public.students (id, school_id)
  on delete restrict not valid;

alter table public.fee_payments drop constraint if exists fee_payments_year_id_fkey;
alter table public.fee_payments add constraint fee_payments_year_id_fkey
  foreign key (year_id, school_id) references public.academic_years (id, school_id)
  on delete restrict not valid;

-- ===================== enrollments =====================
alter table public.enrollments drop constraint if exists enrollments_student_id_fkey;
alter table public.enrollments add constraint enrollments_student_id_fkey
  foreign key (student_id, school_id) references public.students (id, school_id)
  on delete cascade not valid;

alter table public.enrollments drop constraint if exists enrollments_class_id_fkey;
alter table public.enrollments add constraint enrollments_class_id_fkey
  foreign key (class_id, school_id) references public.classes (id, school_id)
  on delete set null (class_id) not valid;

alter table public.enrollments drop constraint if exists enrollments_year_id_fkey;
alter table public.enrollments add constraint enrollments_year_id_fkey
  foreign key (year_id, school_id) references public.academic_years (id, school_id)
  on delete restrict not valid;

-- ===================== subjects =====================
alter table public.subjects drop constraint if exists subjects_department_id_fkey;
alter table public.subjects add constraint subjects_department_id_fkey
  foreign key (department_id, school_id) references public.departments (id, school_id)
  on delete set null (department_id) not valid;

alter table public.subjects drop constraint if exists subjects_teacher_id_fkey;
alter table public.subjects add constraint subjects_teacher_id_fkey
  foreign key (teacher_id, school_id) references public.teachers (id, school_id)
  on delete set null (teacher_id) not valid;

-- ===================== classes / departments =====================
alter table public.classes drop constraint if exists classes_teacher_id_fkey;
alter table public.classes add constraint classes_teacher_id_fkey
  foreign key (teacher_id, school_id) references public.teachers (id, school_id)
  on delete set null (teacher_id) not valid;

alter table public.departments drop constraint if exists departments_head_teacher_id_fkey;
alter table public.departments add constraint departments_head_teacher_id_fkey
  foreign key (head_teacher_id, school_id) references public.teachers (id, school_id)
  on delete set null (head_teacher_id) not valid;

-- ===================== invites =====================
-- invites.teacher_id was validated only inside create_invite(); the FK
-- now guarantees it structurally too. (student_ids stays an array —
-- still RPC-validated — a join table is a bigger refactor for later.)
alter table public.invites drop constraint if exists invites_teacher_id_fkey;
alter table public.invites add constraint invites_teacher_id_fkey
  foreign key (teacher_id, school_id) references public.teachers (id, school_id)
  on delete set null (teacher_id) not valid;

-- invoices/receipts party_id keeps NO foreign key on purpose: financial
-- documents must survive the person's row being deleted (0011/0012).
