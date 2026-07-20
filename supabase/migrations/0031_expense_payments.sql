-- Expense payment history + atomic recording (audit finding 1.6).
--
-- expenses.paid was mutated in place by an app-side read-add-write:
-- two concurrent payments lost one of them, overshoot was silently
-- clamped, and — unlike fees — there was no record of WHEN each partial
-- payment happened or by which method. expense_payments is the ledger
-- (one row per payment, append-only); expenses.paid stays as the
-- denormalized running total the UI already reads, but it is now only
-- written inside record_expense_payment(), in the same transaction as
-- the ledger row, under a per-expense lock, with a hard overpayment
-- rejection instead of a silent clamp.
--
-- Existing paid amounts are backfilled as a single opening ledger row so
-- history starts consistent.

create table if not exists public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null,
  school_id uuid not null references public.schools (id) on delete cascade
    default public.current_school_id(),
  amount numeric(10, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'mobile_money', 'bank_transfer', 'other')),
  note text,
  paid_at timestamptz not null default now(),
  -- same-school reference, structurally (0029 pattern)
  constraint expense_payments_expense_id_fkey
    foreign key (expense_id, school_id) references public.expenses (id, school_id)
    on delete cascade
);

create index if not exists expense_payments_expense_idx on public.expense_payments (expense_id);
create index if not exists expense_payments_school_idx on public.expense_payments (school_id);

alter table public.expense_payments enable row level security;

-- Same posture as expenses itself (salaries live here): finance/admin
-- only, even for reads. Append-only — no update policy on purpose.
drop policy if exists "expense_payments: finance read" on public.expense_payments;
create policy "expense_payments: finance read" on public.expense_payments
  for select using (school_id = public.current_school_id() and public.is_finance());
drop policy if exists "expense_payments: finance insert" on public.expense_payments;
create policy "expense_payments: finance insert" on public.expense_payments
  for insert with check (school_id = public.current_school_id() and public.is_finance());
drop policy if exists "expense_payments: finance delete" on public.expense_payments;
create policy "expense_payments: finance delete" on public.expense_payments
  for delete using (school_id = public.current_school_id() and public.is_finance());

-- Opening balance rows for expenses already partially/fully paid.
insert into public.expense_payments (expense_id, school_id, amount, method, note, paid_at)
select e.id, e.school_id, e.paid, e.method, 'Opening balance (recorded before payment history existed)',
       e.date::timestamptz
from public.expenses e
where e.paid > 0
  and not exists (select 1 from public.expense_payments p where p.expense_id = e.id);

-- ===================== atomic payment =====================
-- SECURITY INVOKER: the caller's own RLS must allow both the ledger
-- insert and the expenses update (finance/admin), same as before.
create or replace function public.record_expense_payment(
  p_expense_id uuid,
  p_amount numeric,
  p_method text default null,
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_expense record;
  v_remaining numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_expense_id::text, 0));

  -- RLS on expenses already limits this to the caller's school + role.
  select id, payee, category, description, amount, paid, method, school_id
    into v_expense
  from public.expenses
  where id = p_expense_id;

  if not found then
    raise exception 'Expense not found.';
  end if;

  v_remaining := v_expense.amount - v_expense.paid;
  if v_remaining <= 0 then
    raise exception 'This expense is already fully paid — nothing is outstanding.';
  end if;
  if p_amount > v_remaining then
    raise exception 'Payment of $% exceeds the outstanding amount of $%.',
      trim(to_char(p_amount, 'FM999999990.00')), trim(to_char(v_remaining, 'FM999999990.00'));
  end if;

  insert into public.expense_payments (expense_id, school_id, amount, method, note)
  values (v_expense.id, v_expense.school_id, p_amount,
          coalesce(p_method, v_expense.method), p_note);

  update public.expenses set paid = paid + p_amount where id = v_expense.id;

  -- Salary payments are wages to a person, so each one also issues a
  -- numbered receipt on the Invoices & Receipts page (moved here from
  -- the app so it shares the payment's transaction). Other categories
  -- pay companies, not staff.
  if v_expense.category = 'salaries' then
    insert into public.receipts
      (party_type, party_id, party_name, party_detail, amount, method, note, school_id)
    values
      ('staff', null, v_expense.payee, 'Salary', p_amount,
       coalesce(p_method, v_expense.method), coalesce(p_note, v_expense.description),
       v_expense.school_id);
  end if;

  return jsonb_build_object(
    'payee', v_expense.payee,
    'paid', v_expense.paid + p_amount,
    'remaining', v_remaining - p_amount
  );
end;
$$;
