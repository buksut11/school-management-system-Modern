-- Invoices + Receipts — billing documents for students (fees), teachers
-- (salaries) and other staff (cleaner, watchman, cook, …).
--
-- A party is whoever the document is for. Students/teachers link back to
-- their row via party_id; other staff are captured by name + role only.
-- party_id is a plain uuid (no FK) on purpose: an invoice or receipt is a
-- financial record and must survive the person's row being deleted later.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  party_type text not null check (party_type in ('student', 'teacher', 'staff')),
  party_id uuid,
  party_name text not null,
  party_detail text, -- class name for students, "Teacher", or a staff role like "Cleaner"
  items jsonb not null default '[]'::jsonb, -- [{ description, qty, unit_price }]
  total numeric(12, 2) not null default 0,
  issued_date date not null default current_date,
  due_date date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  invoice_id uuid references public.invoices (id) on delete set null,
  party_type text not null check (party_type in ('student', 'teacher', 'staff')),
  party_id uuid,
  party_name text not null,
  party_detail text,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'mobile_money', 'bank_transfer', 'other')),
  note text,
  received_at timestamptz not null default now()
);

create index if not exists receipts_invoice_idx on public.receipts (invoice_id);

alter table public.invoices enable row level security;
alter table public.receipts enable row level security;

-- Same posture 0008 gives the other money tables (fees, expenses):
-- any signed-in user can read, only admins can write. is_admin() is
-- (re)defined here so this migration also works on projects that never
-- ran the optional 0008 — there every account is 'admin' (0001's default),
-- so nothing is locked out.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "invoices: read" on public.invoices for select using (auth.role() = 'authenticated');
create policy "invoices: admin write" on public.invoices for insert with check (public.is_admin());
create policy "invoices: admin update" on public.invoices for update using (public.is_admin());
create policy "invoices: admin delete" on public.invoices for delete using (public.is_admin());

create policy "receipts: read" on public.receipts for select using (auth.role() = 'authenticated');
create policy "receipts: admin write" on public.receipts for insert with check (public.is_admin());
create policy "receipts: admin update" on public.receipts for update using (public.is_admin());
create policy "receipts: admin delete" on public.receipts for delete using (public.is_admin());
