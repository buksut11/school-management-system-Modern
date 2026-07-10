"use client";

import { useActionState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordExpensePayment } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils";
import type { ExpenseRow } from "@/lib/data/expenses";

export function ExpensePaymentModal({
  open,
  onClose,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRow | null;
}) {
  const [state, formAction, pending] = useActionState(recordExpensePayment, undefined);
  const { show } = useToast();
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      show(
        expense?.category === "salaries"
          ? "Payment recorded — receipt issued"
          : "Payment recorded"
      );
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!expense) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Record Payment · ${expense.payee}`}>
      <form key={expense.id} action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={expense.id} />

        <div className="rounded-xl bg-card-2 px-4 py-3 text-[13px] flex justify-between">
          <span className="text-text-2">Balance due</span>
          <span className="font-semibold">{formatMoney(expense.balance)}</span>
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            ref={amountRef}
            id="amount"
            name="amount"
            type="number"
            min={1}
            step="0.01"
            defaultValue={expense.balance}
            required
          />
          <button
            type="button"
            onClick={() => {
              if (amountRef.current) amountRef.current.value = String(expense.balance);
            }}
            className="text-[12.5px] text-blue hover:underline mt-1.5"
          >
            Pay full balance
          </button>
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
