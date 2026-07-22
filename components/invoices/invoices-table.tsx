"use client";

import { CircleDollarSign, FileDown, Pencil, Printer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { useSchoolName } from "@/components/layout/school-context";
import type { InvoiceRow } from "@/lib/data/invoices";

const STATUS_TONE = { paid: "green", partial: "orange", unpaid: "red" } as const;
const TYPE_TONE = { student: "blue", teacher: "purple", staff: "teal" } as const;
const TYPE_LABEL = { student: "Student", teacher: "Teacher", staff: "Staff" } as const;

export function InvoicesTable({
  invoices,
  onEdit,
  onDelete,
  onPay,
}: {
  invoices: InvoiceRow[];
  onEdit: (inv: InvoiceRow) => void;
  onDelete: (inv: InvoiceRow) => void;
  onPay: (inv: InvoiceRow) => void;
}) {
  const schoolName = useSchoolName();

  function download(inv: InvoiceRow) {
    import("@/lib/pdf/invoice").then((m) => m.downloadInvoicePdf(inv, schoolName));
  }

  async function print(inv: InvoiceRow) {
    const [{ buildInvoicePdf }, { printPdf }] = await Promise.all([
      import("@/lib/pdf/invoice"),
      import("@/lib/pdf/print"),
    ]);
    printPdf(buildInvoicePdf(inv, schoolName));
  }

  return (
    <div className="r-table inv-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[170px]">Invoice</div>
        <div className="w-20 flex-none icol-type">Type</div>
        <div className="w-24 flex-none icol-issued">Issued</div>
        <div className="w-24 flex-none icol-due">Due</div>
        <div className="w-24 flex-none icol-total">Total</div>
        <div className="w-24 flex-none icol-paid">Paid</div>
        <div className="w-24 flex-none">Balance</div>
        <div className="w-24 flex-none">Status</div>
        <div className="w-40 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {invoices.map((inv) => (
          <div key={inv.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[170px]">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{inv.party_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">
                  {inv.invoice_no}
                  {inv.party_detail ? ` · ${inv.party_detail}` : ""}
                </div>
              </div>
            </div>
            <div className="r-cell icol-type w-20 flex-none" data-label="Type">
              <Badge tone={TYPE_TONE[inv.party_type]}>{TYPE_LABEL[inv.party_type]}</Badge>
            </div>
            <div className="r-cell icol-issued w-24 flex-none text-[13px] text-text-2" data-label="Issued">
              {formatDate(inv.issued_date)}
            </div>
            <div className="r-cell icol-due w-24 flex-none text-[13px] text-text-2" data-label="Due">
              {inv.due_date ? formatDate(inv.due_date) : "—"}
            </div>
            <div className="r-cell icol-total w-24 flex-none text-[13px] font-medium" data-label="Total">
              {formatMoney(inv.total)}
            </div>
            <div className="r-cell icol-paid w-24 flex-none text-[13px] text-text-2" data-label="Paid">
              {formatMoney(inv.paid)}
            </div>
            <div className="r-cell w-24 flex-none text-[13px] font-medium" data-label="Balance">
              {formatMoney(inv.balance)}
            </div>
            <div className="r-cell w-24 flex-none" data-label="Status">
              <Badge tone={STATUS_TONE[inv.status]}>
                {inv.status[0].toUpperCase() + inv.status.slice(1)}
              </Badge>
            </div>
            <div className="r-actions w-40 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => print(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Print invoice"
              >
                <Printer size={14} />
              </button>
              <button
                onClick={() => download(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Download invoice PDF"
              >
                <FileDown size={14} />
              </button>
              {inv.status !== "paid" && (
                <button
                  onClick={() => onPay(inv)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-blue-soft hover:text-blue transition-colors"
                  aria-label="Record payment"
                >
                  <CircleDollarSign size={14} />
                </button>
              )}
              <button
                onClick={() => onEdit(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {invoices.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">
            No invoices yet. Create one with “New Invoice”.
          </div>
        )}
      </div>
    </div>
  );
}
