"use client";

import { FileDown, Printer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import type { ReceiptRow } from "@/lib/data/invoices";

const TYPE_TONE = { student: "blue", teacher: "purple", staff: "teal" } as const;
const TYPE_LABEL = { student: "Student", teacher: "Teacher", staff: "Staff" } as const;
const METHOD_LABEL = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  other: "Other",
} as const;

export function ReceiptsTable({
  receipts,
  onDelete,
}: {
  receipts: ReceiptRow[];
  onDelete: (r: ReceiptRow) => void;
}) {
  function download(r: ReceiptRow) {
    import("@/lib/pdf/receipt").then((m) => m.downloadReceiptPdf(r));
  }

  async function print(r: ReceiptRow) {
    const [{ buildReceiptPdf }, { printPdf }] = await Promise.all([
      import("@/lib/pdf/receipt"),
      import("@/lib/pdf/print"),
    ]);
    printPdf(buildReceiptPdf(r));
  }

  return (
    <div className="r-table rct-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[170px]">Receipt</div>
        <div className="w-20 flex-none rcol-type">Type</div>
        <div className="w-24 flex-none rcol-invoice">Invoice</div>
        <div className="w-24 flex-none rcol-date">Date</div>
        <div className="w-28 flex-none rcol-method">Method</div>
        <div className="w-24 flex-none">Amount</div>
        <div className="w-28 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {receipts.map((r) => (
          <div key={r.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[170px]">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{r.party_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">
                  {r.receipt_no}
                  {r.note ? ` · ${r.note}` : r.party_detail ? ` · ${r.party_detail}` : ""}
                </div>
              </div>
            </div>
            <div className="r-cell rcol-type w-20 flex-none" data-label="Type">
              <Badge tone={TYPE_TONE[r.party_type]}>{TYPE_LABEL[r.party_type]}</Badge>
            </div>
            <div className="r-cell rcol-invoice w-24 flex-none text-[13px] text-text-2" data-label="Invoice">
              {r.invoice_no ?? "—"}
            </div>
            <div className="r-cell rcol-date w-24 flex-none text-[13px] text-text-2" data-label="Date">
              {formatDate(r.received_at)}
            </div>
            <div className="r-cell rcol-method w-28 flex-none text-[13px] text-text-2 truncate" data-label="Method">
              {METHOD_LABEL[r.method]}
            </div>
            <div className="r-cell w-24 flex-none text-[13px] font-medium" data-label="Amount">
              {formatMoney(r.amount)}
            </div>
            <div className="r-actions w-28 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => print(r)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Print receipt"
              >
                <Printer size={14} />
              </button>
              <button
                onClick={() => download(r)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Download receipt PDF"
              >
                <FileDown size={14} />
              </button>
              <button
                onClick={() => onDelete(r)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {receipts.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">
            No receipts yet. Record an invoice payment or create one with “New Receipt”.
          </div>
        )}
      </div>
    </div>
  );
}
