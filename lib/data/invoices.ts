import { createClient } from "@/lib/supabase/server";
import { INVOICES_PAGE_SIZE, RECEIPTS_PAGE_SIZE } from "@/lib/pagination";
import type { Invoice, Receipt, PartyType } from "@/lib/types/database";

type InvoiceStatus = "paid" | "partial" | "unpaid";

export function invoiceNumber(seq: number) {
  return `INV-${String(seq).padStart(5, "0")}`;
}

export function receiptNumber(seq: number) {
  return `RCT-${String(seq).padStart(5, "0")}`;
}

export type InvoiceRow = Invoice & {
  invoice_no: string;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
};

export type InvoicesPage = { rows: InvoiceRow[]; hasMore: boolean };

type ListOpts = {
  search?: string;
  offset?: number;
  limit?: number;
  partyType?: string;
  status?: string;
};

// One page of invoices. Each invoice's paid/balance/status is computed in
// the database by the invoice_balances view (migration 0041), so status
// can be filtered on and the result set stays small. A numeric search
// matches the invoice number (INV-00042); text matches the party name.
export async function listInvoices(opts: ListOpts = {}): Promise<InvoicesPage> {
  const supabase = await createClient();
  const limit = opts.limit ?? INVOICES_PAGE_SIZE;
  const offset = opts.offset ?? 0;
  const search = (opts.search ?? "").trim();

  let query = supabase
    .from("invoice_balances")
    .select("*")
    .order("seq", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.partyType && opts.partyType !== "all") {
    query = query.eq("party_type", opts.partyType as PartyType);
  }
  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status as InvoiceStatus);
  }
  if (search) {
    const digits = search.replace(/[^0-9]/g, "");
    if (digits && /^\s*(inv[-\s]?)?0*\d+\s*$/i.test(search)) {
      query = query.eq("seq", Number(digits));
    } else {
      query = query.ilike("party_name", `%${search}%`);
    }
  }

  const { data } = await query.returns<
    Array<Invoice & { paid: number; balance: number; status: InvoiceRow["status"] }>
  >();
  const rows = data ?? [];
  const hasMore = rows.length === limit;

  return {
    rows: rows.map((inv) => ({
      ...inv,
      items: inv.items ?? [],
      total: Number(inv.total),
      invoice_no: invoiceNumber(inv.seq),
      paid: Number(inv.paid),
      balance: Number(inv.balance),
      status: inv.status,
    })),
    hasMore,
  };
}

export type InvoiceSummary = { invoiced: number; paid: number; outstanding: number; openCount: number };

// School-wide invoice totals for the summary cards, aggregated in the
// database (migration 0041) rather than by loading every row.
export async function getInvoiceSummary(): Promise<InvoiceSummary> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("invoice_summary");
  const row = data?.[0];
  return {
    invoiced: Number(row?.invoiced ?? 0),
    paid: Number(row?.paid ?? 0),
    outstanding: Number(row?.outstanding ?? 0),
    openCount: Number(row?.open_count ?? 0),
  };
}

export type ReceiptRow = Receipt & {
  receipt_no: string;
  invoice_no: string | null;
};

export type ReceiptsPage = { rows: ReceiptRow[]; hasMore: boolean };

// One page of receipts. Numeric search matches the receipt number
// (RCT-00042); text matches the party name.
export async function listReceipts(opts: ListOpts = {}): Promise<ReceiptsPage> {
  const supabase = await createClient();
  const limit = opts.limit ?? RECEIPTS_PAGE_SIZE;
  const offset = opts.offset ?? 0;
  const search = (opts.search ?? "").trim();

  let query = supabase
    .from("receipts")
    .select("*, invoices(seq)")
    .order("seq", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts.partyType && opts.partyType !== "all") {
    query = query.eq("party_type", opts.partyType as PartyType);
  }
  if (search) {
    const digits = search.replace(/[^0-9]/g, "");
    if (digits && /^\s*(rct[-\s]?)?0*\d+\s*$/i.test(search)) {
      query = query.eq("seq", Number(digits));
    } else {
      query = query.ilike("party_name", `%${search}%`);
    }
  }

  const { data } = await query.returns<Array<Receipt & { invoices: { seq: number } | null }>>();
  const rows = data ?? [];
  const hasMore = rows.length === limit;

  return {
    rows: rows.map(({ invoices, ...r }) => ({
      ...r,
      amount: Number(r.amount),
      receipt_no: receiptNumber(r.seq),
      invoice_no: invoices ? invoiceNumber(invoices.seq) : null,
    })),
    hasMore,
  };
}

export type ReceiptSummary = { count: number; moneyIn: number; moneyOut: number };

export async function getReceiptSummary(): Promise<ReceiptSummary> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("receipt_summary");
  const row = data?.[0];
  return {
    count: Number(row?.count ?? 0),
    moneyIn: Number(row?.money_in ?? 0),
    moneyOut: Number(row?.money_out ?? 0),
  };
}

export type StudentOption = {
  id: string;
  full_name: string;
  class_name: string | null;
  base_fees: number;
  mobile: string | null;
  address: string | null;
  parent_mobile: string | null;
};

export async function listStudentOptions(): Promise<StudentOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, base_fees, mobile, address, parent_mobile, classes(name)")
    .eq("status", "active")
    .order("full_name")
    .returns<
      Array<{
        id: string;
        full_name: string;
        base_fees: number;
        mobile: string | null;
        address: string | null;
        parent_mobile: string | null;
        classes: { name: string } | null;
      }>
    >();

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    class_name: s.classes?.name ?? null,
    base_fees: Number(s.base_fees),
    mobile: s.mobile,
    address: s.address,
    parent_mobile: s.parent_mobile,
  }));
}

export type TeacherOption = {
  id: string;
  full_name: string;
  mobile: string | null;
  address: string | null;
};

export async function listTeacherContactOptions(): Promise<TeacherOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, full_name, mobile, address")
    .eq("status", "active")
    .order("full_name");
  return (data ?? []) as TeacherOption[];
}
