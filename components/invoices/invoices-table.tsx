"use client";

import { CircleDollarSign, FileDown, Pencil, Printer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { useSchoolName } from "@/components/layout/school-context";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { InvoiceRow } from "@/lib/data/invoices";

const STATUS_TONE = { paid: "green", partial: "orange", unpaid: "red" } as const;
const TYPE_TONE = { student: "blue", teacher: "purple", staff: "teal" } as const;
const TYPE_KEY = { student: "party.student", teacher: "party.teacher", staff: "party.staffShort" } as const;

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
  const t = useT();

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
        <div className="flex-1 min-w-[170px]">{t("col.invoice")}</div>
        <div className="w-20 flex-none icol-type">{t("col.type")}</div>
        <div className="w-24 flex-none icol-issued">{t("field.issued")}</div>
        <div className="w-24 flex-none icol-due">{t("col.due")}</div>
        <div className="w-24 flex-none icol-total">{t("col.total")}</div>
        <div className="w-24 flex-none icol-paid">{t("col.paid")}</div>
        <div className="w-24 flex-none">{t("col.balance")}</div>
        <div className="w-24 flex-none">{t("col.status")}</div>
        <div className="w-40 flex-none text-right">{t("col.actions")}</div>
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
            <div className="r-cell icol-type w-20 flex-none" data-label={t("col.type")}>
              <Badge tone={TYPE_TONE[inv.party_type]}>{t(TYPE_KEY[inv.party_type] as MessageKey)}</Badge>
            </div>
            <div className="r-cell icol-issued w-24 flex-none text-[13px] text-text-2" data-label={t("field.issued")}>
              {formatDate(inv.issued_date)}
            </div>
            <div className="r-cell icol-due w-24 flex-none text-[13px] text-text-2" data-label={t("col.due")}>
              {inv.due_date ? formatDate(inv.due_date) : "—"}
            </div>
            <div className="r-cell icol-total w-24 flex-none text-[13px] font-medium" data-label={t("col.total")}>
              {formatMoney(inv.total)}
            </div>
            <div className="r-cell icol-paid w-24 flex-none text-[13px] text-text-2" data-label={t("col.paid")}>
              {formatMoney(inv.paid)}
            </div>
            <div className="r-cell w-24 flex-none text-[13px] font-medium" data-label={t("col.balance")}>
              {formatMoney(inv.balance)}
            </div>
            <div className="r-cell w-24 flex-none" data-label={t("col.status")}>
              <Badge tone={STATUS_TONE[inv.status]}>
                {t(`feeStatus.${inv.status}` as MessageKey)}
              </Badge>
            </div>
            <div className="r-actions w-40 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => print(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("invoice.print")}
              >
                <Printer size={14} />
              </button>
              <button
                onClick={() => download(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("invoice.downloadPdf")}
              >
                <FileDown size={14} />
              </button>
              {inv.status !== "paid" && (
                <button
                  onClick={() => onPay(inv)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-blue-soft hover:text-blue transition-colors"
                  aria-label={t("expense.recordPayment")}
                >
                  <CircleDollarSign size={14} />
                </button>
              )}
              <button
                onClick={() => onEdit(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("common.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(inv)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label={t("common.delete")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {invoices.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">{t("invoice.emptyList")}</div>
        )}
      </div>
    </div>
  );
}
