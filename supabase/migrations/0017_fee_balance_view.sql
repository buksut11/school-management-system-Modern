-- Fee balances computed in the database (from schema review).
--
-- The Fees page, dashboard cards and sidebar badges each loaded EVERY
-- fee_payments row into the app server and summed them in JavaScript —
-- floating-point math on money, and O(all payments) work repeated on
-- nearly every page load. This view does the SUM ... GROUP BY in Postgres
-- with exact numeric arithmetic; callers read one row per student.
--
-- security_invoker so the querying user's RLS applies (students and
-- fee_payments are readable by any signed-in user, so the view is too);
-- without it the view would run as its owner and bypass RLS entirely.
--
-- Balance semantics match record_fee_payment(): base_fees is per academic
-- year, so only the current year's payments count toward the balance.

create or replace view public.student_fee_balances
with (security_invoker = true)
as
select
  s.id as student_id,
  s.full_name,
  s.photo_url,
  s.class_id,
  c.name as class_name,
  s.status as student_status,
  s.base_fees as due,
  coalesce(p.paid, 0) as paid,
  greatest(s.base_fees - coalesce(p.paid, 0), 0) as balance,
  case
    when s.base_fees - coalesce(p.paid, 0) <= 0 then 'paid'
    when coalesce(p.paid, 0) > 0 then 'partial'
    else 'unpaid'
  end as fee_status
from public.students s
left join public.classes c on c.id = s.class_id
left join (
  select student_id, sum(amount) as paid
  from public.fee_payments
  where year_id = public.current_academic_year_id()
  group by student_id
) p on p.student_id = s.id;

grant select on public.student_fee_balances to authenticated;
