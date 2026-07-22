"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveReceipt } from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import { EMPTY_PARTY, PartyFields, type PartyState, type TeacherOption } from "./party-fields";
import type { StudentOption } from "@/lib/data/invoices";

/** Standalone receipt — a payment not tied to any invoice (e.g. paying the
 *  watchman's wages, or a walk-in fee payment). */
export function ReceiptModal({
  open,
  onClose,
  onSaved,
  students,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  students: StudentOption[];
  teachers: TeacherOption[];
}) {
  const [state, formAction, pending] = useActionState(saveReceipt, undefined);
  const { show } = useToast();
  const t = useT();
  const [party, setParty] = useState<PartyState>(EMPTY_PARTY);

  useEffect(() => {
    if (state?.success) {
      show(t("receipt.created"));
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={t("receipt.new")}>
      <form action={formAction} className="space-y-4">
        <PartyFields party={party} onChange={setParty} students={students} teachers={teachers} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">{t("field.amountDollar")}</Label>
            <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
          </div>
          <div>
            <Label htmlFor="received_date">{t("field.date")}</Label>
            <Input
              id="received_date"
              name="received_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
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
          <Label htmlFor="note">{t("field.descOptional")}</Label>
          <Input
            id="note"
            name="note"
            placeholder={
              party.type === "student" ? t("receipt.notePlaceholderStudent") : t("receipt.notePlaceholderStaff")
            }
          />
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("receipt.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
