-- Invoice balances + finance summaries computed in the database, so the
-- Invoices page can paginate.
--
-- Until now the Invoices/Receipts page loaded EVERY invoice and EVERY
-- receipt into the app and, in JavaScript: summed receipts per invoice to
-- derive paid/balance/status, filtered by status, and reduced the whole
-- set for the summary cards. That can't be paginated — you can't show one
-- page of invoices and still know each one's status or the school-wide
-- totals. This mirrors student_fee_balances (0017): do the SUM/GROUP BY in
-- Postgres so callers can page, filter by status, and read totals cheaply.
--
-- security_invoker so the caller's RLS applies (invoices/receipts are
-- already scoped to the caller's school and role by 0023); without it the
-- view would run as owner and bypass tenancy.

create or replace view public.invoice_balances
with (security_invoker = true)
as
select
  i.*,
  coalesce(r.paid, 0) as paid,
  greatest(i.total - coalesce(r.paid, 0), 0) as balance,
  case
    when i.total - coalesce(r.paid, 0) <= 0 then 'paid'
    when coalesce(r.paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as status
from public.invoices i
left join (
  select invoice_id, sum(amount) as paid
  from public.receipts
  where invoice_id is not null
  group by invoice_id
) r on r.invoice_id = i.id;

grant select on public.invoice_balances to authenticated;

-- School-wide invoice totals for the summary cards. SECURITY INVOKER (the
-- default) + reading the security_invoker view means the caller's own RLS
-- decides which rows count, so the totals stay per-school.
create or replace function public.invoice_summary()
returns table (invoiced numeric, paid numeric, outstanding numeric, open_count bigint)
language sql
stable
as $$
  select
    coalesce(sum(total), 0)::numeric,
    coalesce(sum(paid), 0)::numeric,
    coalesce(sum(balance), 0)::numeric,
    count(*) filter (where status <> 'paid')
  from public.invoice_balances;
$$;

-- Receipt totals: money in (from students) vs money out (staff wages).
create or replace function public.receipt_summary()
returns table (count bigint, money_in numeric, money_out numeric)
language sql
stable
as $$
  select
    count(*),
    coalesce(sum(amount) filter (where party_type = 'student'), 0)::numeric,
    coalesce(sum(amount) filter (where party_type <> 'student'), 0)::numeric
  from public.receipts;
$$;

grant execute on function public.invoice_summary() to authenticated;
grant execute on function public.receipt_summary() to authenticated;
