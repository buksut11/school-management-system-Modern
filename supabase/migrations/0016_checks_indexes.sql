-- Integrity checks + index gaps (from schema review).
--
-- 1. Range constraints the app previously trusted on faith: the exam form
--    caps scores at 100 with an HTML min/max attribute, but nothing
--    stopped a crafted request (or a typo in the SQL editor) from storing
--    attendance_pct = 850. These are added NOT VALID so the migration
--    always succeeds even if legacy rows are out of range — new and
--    updated rows are checked immediately. Once you've confirmed existing
--    data is clean, validate each with e.g.:
--      alter table public.exams validate constraint exams_attendance_pct_range;
--
-- 2. Indexes for the date-range and party lookups that scan today:
--    the dashboard reads the newest activity_log rows on every load, the
--    reports page range-scans fee_payments.paid_at and expenses.date, and
--    the invoices page looks up documents by party.

-- ===================== range checks =====================
alter table public.exams drop constraint if exists exams_attendance_pct_range;
alter table public.exams add constraint exams_attendance_pct_range
  check (attendance_pct >= 0 and attendance_pct <= 100) not valid;

alter table public.exams drop constraint if exists exams_test_score_range;
alter table public.exams add constraint exams_test_score_range
  check (test_score >= 0 and test_score <= 100) not valid;

alter table public.exams drop constraint if exists exams_total_score_nonneg;
alter table public.exams add constraint exams_total_score_nonneg
  check (total_score >= 0) not valid;

alter table public.students drop constraint if exists students_base_fees_nonneg;
alter table public.students add constraint students_base_fees_nonneg
  check (base_fees >= 0) not valid;

alter table public.classes drop constraint if exists classes_base_fees_nonneg;
alter table public.classes add constraint classes_base_fees_nonneg
  check (base_fees >= 0) not valid;

alter table public.classes drop constraint if exists classes_capacity_positive;
alter table public.classes add constraint classes_capacity_positive
  check (capacity > 0) not valid;

alter table public.expenses drop constraint if exists expenses_amount_nonneg;
alter table public.expenses add constraint expenses_amount_nonneg
  check (amount >= 0) not valid;

alter table public.expenses drop constraint if exists expenses_paid_nonneg;
alter table public.expenses add constraint expenses_paid_nonneg
  check (paid >= 0) not valid;

alter table public.invoices drop constraint if exists invoices_total_nonneg;
alter table public.invoices add constraint invoices_total_nonneg
  check (total >= 0) not valid;

alter table public.invoices drop constraint if exists invoices_due_after_issue;
alter table public.invoices add constraint invoices_due_after_issue
  check (due_date is null or due_date >= issued_date) not valid;

-- ===================== index gaps =====================
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists fee_payments_paid_at_idx on public.fee_payments (paid_at);
create index if not exists expenses_date_idx on public.expenses (date);
create index if not exists receipts_received_idx on public.receipts (received_at);
create index if not exists receipts_party_idx on public.receipts (party_id);
create index if not exists invoices_party_idx on public.invoices (party_id);
create index if not exists invoices_issued_idx on public.invoices (issued_date);
