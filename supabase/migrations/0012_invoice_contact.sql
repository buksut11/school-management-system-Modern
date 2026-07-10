-- Contact details captured on each invoice/receipt.
--
-- These are snapshotted onto the document (not read live from the student
-- row) on purpose: an invoice is a financial record and must keep the
-- name, phone, address and parent/guardian details that were true when it
-- was issued, even if the student's row later changes or is deleted
-- (party_id has no FK for exactly this reason).

alter table public.invoices
  add column if not exists party_phone text,
  add column if not exists party_address text,
  add column if not exists parent_name text,
  add column if not exists parent_phone text;

alter table public.receipts
  add column if not exists party_phone text,
  add column if not exists party_address text,
  add column if not exists parent_name text,
  add column if not exists parent_phone text;
