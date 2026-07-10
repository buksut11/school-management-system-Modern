"use client";

import { useActionState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordInvoicePayment } from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils";
import type { InvoiceRow } from "@/lib/data/invoices";

export function InvoicePaymentModal({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceRow | null;
}) {
  const [state, formAction, pending] = useActionState(recordInvoicePayment, undefined);
  const { show } = useToast();
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      show("Payment recorded — receipt created");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!invoice) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Record Payment · ${invoice.invoice_no}`}>
      <form key={invoice.id} action={formAction} className="space-y-4">
        <input type="hidden" name="invoice_id" value={invoice.id} />

        <div className="rounded-xl bg-card-2 px-4 py-3 text-[13px] space-y-1.5">
          <div className="flex justify-between">
            <span className="text-text-2">{invoice.party_name}</span>
            <span className="text-text-2">{invoice.party_detail ?? ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-2">Balance due</span>
            <span className="font-semibold">{formatMoney(invoice.balance)}</span>
          </div>
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
            defaultValue={invoice.balance}
            required
          />
          <button
            type="button"
            onClick={() => {
              if (amountRef.current) amountRef.current.value = String(invoice.balance);
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
          <Input id="note" name="note" placeholder="e.g. First installment" />
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
