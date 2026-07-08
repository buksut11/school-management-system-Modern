"use client";

import { Pencil, Trash2, CircleDollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import type { ExpenseRow } from "@/lib/data/expenses";

const STATUS_TONE = { paid: "green", partial: "orange", unpaid: "red" } as const;

export function ExpensesGrid({
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
  if (expenses.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">No expenses found.</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {expenses.map((e) => (
        <Card key={e.id} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium truncate">{e.payee}</div>
              <div className="text-[11.5px] text-text-2">{formatDate(e.date)}</div>
            </div>
            <Badge tone={STATUS_TONE[e.status]}>{e.status[0].toUpperCase() + e.status.slice(1)}</Badge>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>Category</span>
              <span className="text-text font-medium">{e.category[0].toUpperCase() + e.category.slice(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="text-text font-medium">{formatMoney(e.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance</span>
              <span className="text-text font-medium">{formatMoney(e.balance)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {e.status !== "paid" && (
              <button
                onClick={() => onPay(e)}
                className="flex-1 h-8 rounded-lg bg-blue-soft hover:bg-blue/20 text-blue text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <CircleDollarSign size={13} /> Pay
              </button>
            )}
            <button
              onClick={() => onEdit(e)}
              className="flex-1 h-8 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(e)}
              className="flex-1 h-8 rounded-lg bg-red/10 hover:bg-red/20 text-red text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
