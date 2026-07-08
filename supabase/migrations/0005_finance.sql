-- Fees (payments against each student's base_fees) + Expenses (school payables)

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'mobile_money', 'bank_transfer', 'other')),
  note text,
  paid_at timestamptz not null default now()
);

create index if not exists fee_payments_student_idx on public.fee_payments (student_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  payee text not null,
  category text not null default 'other' check (
    category in ('salaries', 'rent', 'utilities', 'supplies', 'maintenance', 'transport', 'other')
  ),
  description text,
  amount numeric(10, 2) not null default 0,
  paid numeric(10, 2) not null default 0,
  date date not null default current_date,
  method text not null default 'cash' check (method in ('cash', 'mobile_money', 'bank_transfer', 'other')),
  created_at timestamptz not null default now()
);

alter table public.fee_payments enable row level security;
alter table public.expenses enable row level security;

create policy "fee_payments: staff full access" on public.fee_payments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "expenses: staff full access" on public.expenses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
