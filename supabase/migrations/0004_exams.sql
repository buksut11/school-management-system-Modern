-- Exams & Grades + Academic Records (both read from this one table)

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  term text not null default 'Term 1' check (term in ('Term 1', 'Term 2', 'Term 3')),
  exam_date date not null default current_date,
  attendance_pct numeric(5, 1) not null default 100,
  test_score numeric(5, 1) not null default 0,
  subject_scores jsonb not null default '{}'::jsonb,
  total_score numeric(6, 1) not null default 0,
  grade text not null default '-',
  created_at timestamptz not null default now(),
  unique (student_id, term)
);

create index if not exists exams_class_idx on public.exams (class_id);

alter table public.exams enable row level security;

create policy "exams: staff full access" on public.exams
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
