"use client";

import { CircleDollarSign, Printer, Receipt, SlidersHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { useSchoolName } from "@/components/layout/school-context";
import { useT } from "@/lib/i18n/client";
import type { FeeRow } from "@/lib/data/fees";

const STATUS_TONE = { paid: "green", partial: "orange", unpaid: "red" } as const;
const STATUS_KEY = { paid: "feeStatus.paid", partial: "feeStatus.partial", unpaid: "feeStatus.unpaid" } as const;

export function FeesTable({
  rows,
  onPay,
  onAdjust,
}: {
  rows: FeeRow[];
  onPay: (r: FeeRow) => void;
  onAdjust: (r: FeeRow) => void;
}) {
  const schoolName = useSchoolName();
  const t = useT();

  async function print(r: FeeRow) {
    const [{ buildFeeReceipt }, { printPdf }] = await Promise.all([
      import("@/lib/pdf/fee-receipt"),
      import("@/lib/pdf/print"),
    ]);
    printPdf(buildFeeReceipt(r, schoolName));
  }

  return (
    <div className="r-table fee-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[160px]">{t("col.student")}</div>
        <div className="w-24 flex-none fcol-class">{t("col.class")}</div>
        <div className="w-24 flex-none fcol-due">{t("col.due")}</div>
        <div className="w-24 flex-none fcol-paid">{t("col.paid")}</div>
        <div className="w-24 flex-none">{t("col.balance")}</div>
        <div className="w-24 flex-none">{t("col.status")}</div>
        <div className="w-48 flex-none text-right">{t("col.action")}</div>
      </div>

      <div className="divide-y divide-line/60">
        {rows.map((r) => (
          <div key={r.student_id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[160px] flex items-center gap-2.5">
              <Avatar name={r.student_name} photoUrl={r.photo_url} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{r.student_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">{r.class_name ?? "—"}</div>
              </div>
            </div>
            <div className="r-cell fcol-class w-24 flex-none text-[13px] text-text-2" data-label={t("col.class")}>
              {r.class_name ?? "—"}
            </div>
            <div className="r-cell fcol-due w-24 flex-none text-[13px] text-text-2" data-label={t("col.due")}>
              {formatMoney(r.due)}
              {r.discount > 0 && (
                <div
                  className="text-[11px] text-green truncate"
                  title={r.discount_reason ?? t("col.discount")}
                >
                  −{formatMoney(r.discount)}
                </div>
              )}
            </div>
            <div className="r-cell fcol-paid w-24 flex-none text-[13px] text-text-2" data-label={t("col.paid")}>
              {formatMoney(r.paid)}
            </div>
            <div className="r-cell w-24 flex-none text-[13px] font-medium" data-label={t("col.balance")}>
              {formatMoney(r.balance)}
              {r.overdue > 0 ? (
                <div className="text-[11px] font-semibold text-red">
                  {t("fee.overdue", { amount: formatMoney(r.overdue) })}
                </div>
              ) : r.balance > 0 && r.next_due_date ? (
                <div className="text-[11px] font-normal text-text-2 truncate">
                  {r.next_due_label ?? t("col.next")} · {formatDate(r.next_due_date)}
                </div>
              ) : null}
            </div>
            <div className="r-cell w-24 flex-none" data-label={t("col.status")}>
              <Badge tone={STATUS_TONE[r.status]}>{t(STATUS_KEY[r.status])}</Badge>
            </div>
            <div className="r-actions w-48 flex-none flex justify-end gap-1.5">
              <button
                onClick={() => onAdjust(r)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("fees.adjust")}
                title={t("fees.adjustTitle")}
              >
                <SlidersHorizontal size={14} />
              </button>
              <button
                onClick={() => print(r)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("fees.printReceipt")}
              >
                <Printer size={14} />
              </button>
              <button
                onClick={() => import("@/lib/pdf/fee-receipt").then((m) => m.downloadFeeReceipt(r, schoolName))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("fees.downloadReceipt")}
              >
                <Receipt size={14} />
              </button>
              <button
                onClick={() => onPay(r)}
                disabled={r.status === "paid"}
                className="h-8 px-3 rounded-lg bg-blue-soft text-blue text-[12.5px] font-medium flex items-center gap-1.5 hover:bg-blue/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <CircleDollarSign size={14} /> {t("fee.record")}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">{t("student.notFound")}</div>
        )}
      </div>
    </div>
  );
}
