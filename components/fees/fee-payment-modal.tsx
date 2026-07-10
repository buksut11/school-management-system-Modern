"use client";

import { useActionState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordFeePayment } from "@/lib/actions/fees";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils";
import type { FeeRow } from "@/lib/data/fees";

export function FeePaymentModal({
  open,
  onClose,
  fee,
}: {
  open: boolean;
  onClose: () => void;
  fee: FeeRow | null;
}) {
  const [state, formAction, pending] = useActionState(recordFeePayment, undefined);
  const { show } = useToast();
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      show("Payment recorded — receipt issued");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!fee) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Record Payment · ${fee.student_name}`}>
      <form key={fee.student_id} action={formAction} className="space-y-4">
        <input type="hidden" name="student_id" value={fee.student_id} />

        <div className="rounded-xl bg-card-2 px-4 py-3 text-[13px] flex justify-between">
          <span className="text-text-2">Balance due</span>
          <span className="font-semibold">{formatMoney(fee.balance)}</span>
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
            defaultValue={fee.balance}
            required
          />
          <button
            type="button"
            onClick={() => {
              if (amountRef.current) amountRef.current.value = String(fee.balance);
            }}
            className="text-[12.5px] text-blue hover:underline mt-1.5"
          >
            Pay full balance
          </button>
        </div>

        <div>
          <Label htmlFor="method">Method</Label>
          <Select id="method" name="method" defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" name="note" placeholder="e.g. Term 1 installment" />
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
