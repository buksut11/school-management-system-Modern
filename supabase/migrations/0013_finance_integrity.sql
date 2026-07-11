-- Finance integrity fixes (from schema review):
--
-- 1. fee_payments.student_id was `on delete cascade`, so deleting a student
--    silently erased their entire payment history — contradicting the
--    stated design of invoices/receipts ("a financial record must survive
--    the person's row being deleted", 0011). The FK is now RESTRICT: a
--    student with payments can't be hard-deleted; mark them inactive
--    instead. The app surfaces this as a friendly message.
--
-- 2. Recording a fee payment was two separate inserts from the app
--    (fee_payments, then receipts) with no transaction and no balance
--    check. A failure between the two desynced the ledgers, and two
--    concurrent submissions could pay a student past their base_fees —
--    invisibly, since the UI clamps negative balances to zero.
--    record_fee_payment() now does the whole thing atomically inside the
--    database: it holds a per-student lock, rejects overpayment, inserts
--    the payment and its numbered receipt in one transaction, and returns
--    the fresh balance.

-- ===================== 1. protect payment history =====================
alter table public.fee_payments
  drop constraint if exists fee_payments_student_id_fkey;

alter table public.fee_payments
  add constraint fee_payments_student_id_fkey
  foreign key (student_id) references public.students (id) on delete restrict;

-- ===================== 2. atomic payment + receipt =====================
-- SECURITY INVOKER (the default): RLS still applies inside, so the same
-- policies that govern direct inserts (admin-only writes on fee_payments
-- and receipts under 0008/0011) govern this function too.
create or replace function public.record_fee_payment(
  p_student_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_student record;
  v_class_name text;
  v_paid numeric;
  v_balance numeric;
  v_payment_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  -- Serialize concurrent payments for the same student so the balance
  -- check below can't race (lock releases at end of transaction).
  perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  select id, full_name, base_fees, mobile, address, parent_mobile, class_id
    into v_student
  from public.students
  where id = p_student_id;

  if not found then
    raise exception 'Student not found.';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.fee_payments
  where student_id = p_student_id;

  v_balance := v_student.base_fees - v_paid;
  if v_balance <= 0 then
    raise exception 'Fees are already fully paid — nothing is outstanding.';
  end if;
  if p_amount > v_balance then
    raise exception 'Payment of $% exceeds the outstanding balance of $%.',
      trim(to_char(p_amount, 'FM999999990.00')), trim(to_char(v_balance, 'FM999999990.00'));
  end if;

  select name into v_class_name from public.classes where id = v_student.class_id;

  insert into public.fee_payments (student_id, amount, method, note)
  values (p_student_id, p_amount, p_method, p_note)
  returning id into v_payment_id;

  -- Numbered receipt with contact details snapshotted at payment time,
  -- same as before — but now in the same transaction as the payment.
  insert into public.receipts
    (party_type, party_id, party_name, party_detail,
     party_phone, party_address, parent_phone, amount, method, note)
  values
    ('student', p_student_id, v_student.full_name, v_class_name,
     v_student.mobile, v_student.address, v_student.parent_mobile,
     p_amount, p_method, coalesce(p_note, 'School fees'));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'student_name', v_student.full_name,
    'paid', v_paid + p_amount,
    'balance', v_balance - p_amount
  );
end;
$$;
