-- Atomic invoice payments with an overpayment guard (audit finding 1.5).
--
-- Recording an invoice payment was an app-side read (invoice) + insert
-- (receipt) with no cap: nothing stopped the sum of receipts from
-- exceeding the invoice total — two concurrent submissions, or a typo,
-- silently overpaid, and the UI clamps the balance to zero so nobody
-- would see it. record_invoice_payment() mirrors record_fee_payment():
-- a per-invoice lock, a balance check against the receipts ledger, and
-- the snapshot receipt — all in one transaction.
--
-- SECURITY INVOKER: RLS still applies, so the same policies that govern
-- direct receipt inserts (the money desk, 0023) govern this function.

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_invoice record;
  v_paid numeric;
  v_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  -- Serialize concurrent payments for the same invoice (lock releases at
  -- end of transaction).
  perform pg_advisory_xact_lock(hashtextextended(p_invoice_id::text, 0));

  -- RLS on invoices already limits this to the caller's school.
  select id, party_type, party_id, party_name, party_detail, party_phone,
         party_address, parent_name, parent_phone, total, school_id
    into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found.';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.receipts
  where invoice_id = p_invoice_id;

  v_balance := v_invoice.total - v_paid;
  if v_balance <= 0 then
    raise exception 'This invoice is already fully paid — nothing is outstanding.';
  end if;
  if p_amount > v_balance then
    raise exception 'Payment of $% exceeds the outstanding balance of $%.',
      trim(to_char(p_amount, 'FM999999990.00')), trim(to_char(v_balance, 'FM999999990.00'));
  end if;

  insert into public.receipts
    (invoice_id, party_type, party_id, party_name, party_detail,
     party_phone, party_address, parent_name, parent_phone,
     amount, method, note, school_id)
  values
    (v_invoice.id, v_invoice.party_type, v_invoice.party_id, v_invoice.party_name,
     v_invoice.party_detail, v_invoice.party_phone, v_invoice.party_address,
     v_invoice.parent_name, v_invoice.parent_phone,
     p_amount, p_method, p_note, v_invoice.school_id);

  return jsonb_build_object(
    'party_name', v_invoice.party_name,
    'paid', v_paid + p_amount,
    'balance', v_balance - p_amount
  );
end;
$$;
