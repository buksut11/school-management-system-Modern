import { createClient } from "@/lib/supabase/server";
import type { Invoice, Receipt } from "@/lib/types/database";

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

export async function listInvoices(): Promise<InvoiceRow[]> {
  const supabase = await createClient();

  const [{ data: invoices }, { data: receipts }] = await Promise.all([
    supabase.from("invoices").select("*").order("seq", { ascending: false }),
    supabase.from("receipts").select("invoice_id, amount").not("invoice_id", "is", null),
  ]);

  const paidByInvoice = new Map<string, number>();
  (receipts ?? []).forEach((r) => {
    if (!r.invoice_id) return;
    paidByInvoice.set(r.invoice_id, (paidByInvoice.get(r.invoice_id) ?? 0) + Number(r.amount));
  });

  return (invoices ?? []).map((inv) => {
    const total = Number(inv.total);
    const paid = paidByInvoice.get(inv.id) ?? 0;
    const balance = Math.max(0, total - paid);
    const status: InvoiceRow["status"] = balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    return {
      ...inv,
      items: inv.items ?? [],
      total,
      invoice_no: invoiceNumber(inv.seq),
      paid,
      balance,
      status,
    };
  });
}

export type ReceiptRow = Receipt & {
  receipt_no: string;
  invoice_no: string | null;
};

export async function listReceipts(): Promise<ReceiptRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("receipts")
    .select("*, invoices(seq)")
    .order("seq", { ascending: false })
    .returns<Array<Receipt & { invoices: { seq: number } | null }>>();

  return (data ?? []).map(({ invoices, ...r }) => ({
    ...r,
    amount: Number(r.amount),
    receipt_no: receiptNumber(r.seq),
    invoice_no: invoices ? invoiceNumber(invoices.seq) : null,
  }));
}

export type StudentOption = {
  id: string;
  full_name: string;
  class_name: string | null;
  base_fees: number;
};

export async function listStudentOptions(): Promise<StudentOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("id, full_name, base_fees, classes(name)")
    .eq("status", "active")
    .order("full_name")
    .returns<
      Array<{ id: string; full_name: string; base_fees: number; classes: { name: string } | null }>
    >();

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    class_name: s.classes?.name ?? null,
    base_fees: Number(s.base_fees),
  }));
}
