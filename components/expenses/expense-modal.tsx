"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveExpense } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/toast";
import type { ExpenseRow } from "@/lib/data/expenses";

const CATEGORIES = ["salaries", "rent", "utilities", "supplies", "maintenance", "transport", "other"] as const;

export function ExpenseModal({
  open,
  onClose,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRow | null;
}) {
  const [state, formAction, pending] = useActionState(saveExpense, undefined);
  const { show } = useToast();

  useEffect(() => {
    if (state?.success) {
      show(expense ? "Expense updated" : "Expense added");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={expense ? "Edit Expense" : "Add Expense"}>
      <form action={formAction} className="space-y-4">
        {expense && <input type="hidden" name="id" value={expense.id} />}

        <div>
          <Label htmlFor="payee">Payee</Label>
          <Input id="payee" name="payee" defaultValue={expense?.payee} placeholder="e.g. City Water Co." required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={expense?.category ?? "other"}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={expense?.date ?? new Date().toISOString().slice(0, 10)} />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" defaultValue={expense?.description ?? ""} placeholder="e.g. October water bill" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input id="amount" name="amount" type="number" min={0} step="0.01" defaultValue={expense?.amount ?? 0} required />
          </div>
          <div>
            <Label htmlFor="method">Method</Label>
            <Select id="method" name="method" defaultValue={expense?.method ?? "cash"}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
