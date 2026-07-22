"use client";

import { useActionState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { recordInvoicePayment } from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { InvoiceRow } from "@/lib/data/invoices";

export function InvoicePaymentModal({
  open,
  onClose,
  onSaved,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  invoice: InvoiceRow | null;
}) {
  const [state, formAction, pending] = useActionState(recordInvoicePayment, undefined);
  const { show } = useToast();
  const amountRef = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    if (state?.success) {
      show(t("invoice.paymentRecorded"));
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!invoice) return null;

  return (
    <Modal open={open} onClose={onClose} title={t("fee.recordTitle", { name: invoice.invoice_no })}>
      <form key={invoice.id} action={formAction} className="space-y-4">
        <input type="hidden" name="invoice_id" value={invoice.id} />

        <div className="rounded-xl bg-card-2 px-4 py-3 text-[13px] space-y-1.5">
          <div className="flex justify-between">
            <span className="text-text-2">{invoice.party_name}</span>
            <span className="text-text-2">{invoice.party_detail ?? ""}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-2">{t("fee.balanceDue")}</span>
            <span className="font-semibold">{formatMoney(invoice.balance)}</span>
          </div>
        </div>

        <div>
          <Label htmlFor="amount">{t("field.amount")}</Label>
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
            {t("fee.payFull")}
          </button>
        </div>

        <div>
          <Label htmlFor="method">{t("field.method")}</Label>
          <Select id="method" name="method" defaultValue="cash">
            <option value="cash">{t("method.cash")}</option>
            <option value="mobile_money">{t("method.mobile_money")}</option>
            <option value="bank_transfer">{t("method.bank_transfer")}</option>
            <option value="other">{t("method.other")}</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="note">{t("field.noteOptional")}</Label>
          <Input id="note" name="note" placeholder={t("invoice.paymentNotePlaceholder")} />
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("fee.recording") : t("fee.recordPayment")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
