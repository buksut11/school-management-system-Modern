"use client";

import { Pencil, Trash2, CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import type { ExpenseRow } from "@/lib/data/expenses";

const STATUS_TONE = { paid: "green", partial: "orange", unpaid: "red" } as const;

export function ExpensesTable({
  expenses,
  onEdit,
  onDelete,
  onPay,
}: {
  expenses: ExpenseRow[];
  onEdit: (e: ExpenseRow) => void;
  onDelete: (e: ExpenseRow) => void;
  onPay: (e: ExpenseRow) => void;
}) {
  return (
    <div className="r-table exp-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[170px]">Payee</div>
        <div className="w-28 flex-none ecol-cat">Category</div>
        <div className="w-24 flex-none ecol-date">Date</div>
        <div className="w-28 flex-none ecol-method">Method</div>
        <div className="w-24 flex-none">Amount</div>
        <div className="w-24 flex-none ecol-paid">Paid</div>
        <div className="w-24 flex-none">Status</div>
        <div className="w-28 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {expenses.map((e) => (
          <div key={e.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[170px]">
              <div className="text-[13.5px] font-medium truncate">{e.payee}</div>
              {e.description && <div className="text-[11.5px] text-text-2 truncate">{e.description}</div>}
            </div>
            <div className="r-cell ecol-cat w-28 flex-none" data-label="Category">
              <Badge tone="gray">{e.category[0].toUpperCase() + e.category.slice(1)}</Badge>
            </div>
            <div className="r-cell ecol-date w-24 flex-none text-[13px] text-text-2" data-label="Date">
              {formatDate(e.date)}
            </div>
            <div className="r-cell ecol-method w-28 flex-none text-[13px] text-text-2 truncate" data-label="Method">
              {e.method.replace("_", " ")}
            </div>
            <div className="r-cell w-24 flex-none text-[13px] font-medium" data-label="Amount">
              {formatMoney(e.amount)}
            </div>
            <div className="r-cell ecol-paid w-24 flex-none text-[13px] text-text-2" data-label="Paid">
              {formatMoney(e.paid)}
            </div>
            <div className="r-cell w-24 flex-none" data-label="Status">
              <Badge tone={STATUS_TONE[e.status]}>{e.status[0].toUpperCase() + e.status.slice(1)}</Badge>
            </div>
            <div className="r-actions w-28 flex-none flex items-center justify-end gap-1">
              {e.status !== "paid" && (
                <button
                  onClick={() => onPay(e)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-blue-soft hover:text-blue transition-colors"
                  aria-label="Record payment"
                >
                  <CircleDollarSign size={14} />
                </button>
              )}
              <button
                onClick={() => onEdit(e)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(e)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No expenses found.</div>
        )}
      </div>
    </div>
  );
}
