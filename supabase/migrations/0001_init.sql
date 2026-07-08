-- Sh.Asharow Primary & Secondary School LMS — core schema
-- Covers: profiles, classes, teachers, students, attendance, activity_log
-- Later phases (exams, academic records, fees, expenses, subjects, departments)
-- get their own migrations when those modules are built.

create extension if not exists "pgcrypto";

-- ===================== profiles =====================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===================== classes =====================
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  name text not null unique,
  room text,
  base_fees numeric(10, 2) not null default 0,
  teacher_id uuid, -- FK added after teachers exists
  created_at timestamptz not null default now()
);

-- ===================== teachers =====================
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  full_name text not null,
  dob date,
  gender text check (gender in ('male', 'female')),
  address text,
  mobile text,
  subjects text[] not null default '{}',
  class_id uuid references public.classes (id) on delete set null,
  photo_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.classes
  add constraint classes_teacher_id_fkey foreign key (teacher_id)
  references public.teachers (id) on delete set null;

-- ===================== students =====================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  full_name text not null,
  dob date,
  gender text check (gender in ('male', 'female')),
  address text,
  mobile text,
  parent_mobile text,
  class_id uuid references public.classes (id) on delete set null,
  base_fees numeric(10, 2) not null default 0,
  photo_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ===================== attendance =====================
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  date date not null default current_date,
  status text not null default 'present' check (status in ('present', 'late', 'absent')),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index if not exists attendance_date_idx on public.attendance (date);

-- ===================== activity_log =====================
create table if not exists public.activity_log (
  id bigserial primary key,
  kind text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ===================== RLS: any authenticated staff member has full access =====================
alter table public.classes enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.activity_log enable row level security;

create policy "classes: staff full access" on public.classes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "teachers: staff full access" on public.teachers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "students: staff full access" on public.students
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "attendance: staff full access" on public.attendance
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "activity_log: staff full access" on public.activity_log
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ===================== seed classes (Form 1C / 2A / 3B / 4A) =====================
insert into public.classes (name, room, base_fees)
values
  ('Form 1C', 'Room 12', 120),
  ('Form 2A', 'Room 8', 130),
  ('Form 3B', 'Room 5', 140),
  ('Form 4A', 'Room 1', 150)
on conflict (name) do nothing;
