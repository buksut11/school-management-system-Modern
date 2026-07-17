"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setStudentFee } from "@/lib/actions/fees";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils";
import type { FeeRow } from "@/lib/data/fees";

export function StudentFeeModal({
  open,
  onClose,
  fee,
}: {
  open: boolean;
  onClose: () => void;
  fee: FeeRow | null;
}) {
  const [state, formAction, pending] = useActionState(setStudentFee, undefined);
  const { show } = useToast();
  const [amount, setAmount] = useState(String(fee?.gross ?? 0));
  const [discount, setDiscount] = useState(String(fee?.discount ?? 0));

  useEffect(() => {
    if (state?.success) {
      show("Fee plan updated");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!fee) return null;
  const net = Math.max(0, (Number(amount) || 0) - (Number(discount) || 0));

  return (
    <Modal open={open} onClose={onClose} title={`Adjust fees — ${fee.student_name}`}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="student_id" value={fee.student_id} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fee-amount">Annual fee ($)</Label>
            <Input
              id="fee-amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="fee-discount">Discount ($)</Label>
            <Input
              id="fee-discount"
              name="discount"
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="fee-reason">Discount reason</Label>
          <Input
            id="fee-reason"
            name="discount_reason"
            defaultValue={fee.discount_reason ?? ""}
            placeholder="Scholarship, sibling discount, staff child…"
          />
        </div>

        <div className="rounded-xl bg-card-2 px-3.5 py-2.5 text-[13px] flex items-center justify-between">
          <span className="text-text-2">Net due this year</span>
          <span className="font-semibold">{formatMoney(net)}</span>
        </div>
        <p className="text-[12px] text-text-2">
          Applies to the current academic year; already-recorded payments (
          {formatMoney(fee.paid)}) stay untouched. Only finance or admin accounts can adjust fees.
        </p>

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
