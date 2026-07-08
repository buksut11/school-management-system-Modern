-- Departments + Subjects (academic structure)

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  name text not null unique,
  head_teacher_id uuid references public.teachers (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  name text not null,
  department_id uuid references public.departments (id) on delete set null,
  teacher_id uuid references public.teachers (id) on delete set null,
  type text not null default 'core' check (type in ('core', 'elective')),
  periods_per_week int not null default 0,
  description text,
  created_at timestamptz not null default now()
);

alter table public.departments enable row level security;
alter table public.subjects enable row level security;

create policy "departments: staff full access" on public.departments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "subjects: staff full access" on public.subjects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.departments (name)
values ('Languages'), ('Sciences'), ('Mathematics'), ('Humanities'), ('Religious Studies'), ('Arts')
on conflict (name) do nothing;

insert into public.subjects (name, department_id, type, periods_per_week)
select s.name, d.id, s.type, s.periods
from (values
  ('Somali', 'Languages', 'core', 5),
  ('English', 'Languages', 'core', 5),
  ('Arabic', 'Religious Studies', 'core', 4),
  ('Chemistry', 'Sciences', 'core', 4),
  ('Physics', 'Sciences', 'core', 4),
  ('Maths', 'Mathematics', 'core', 6),
  ('Geography', 'Humanities', 'elective', 3)
) as s(name, dept, type, periods)
join public.departments d on d.name = s.dept
on conflict do nothing;
