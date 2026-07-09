-- Every list/count query in the app filters students and teachers by
-- status = 'active' — that's a WHERE clause hit on nearly every page load
-- (dashboard, sidebar badges, students, teachers, attendance, fees, exams).
-- Neither column had an index, so each of those queries does a full table
-- scan; harmless at a few dozen rows, increasingly costly as enrollment
-- grows. classes.teacher_id and subjects' two FKs get the same treatment
-- since they're looked up on every Teachers/Subjects/Departments load.

create index if not exists students_status_idx on public.students (status);
create index if not exists teachers_status_idx on public.teachers (status);
create index if not exists classes_teacher_idx on public.classes (teacher_id);
create index if not exists subjects_department_idx on public.subjects (department_id);
create index if not exists subjects_teacher_idx on public.subjects (teacher_id);
