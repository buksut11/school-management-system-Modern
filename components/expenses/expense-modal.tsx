"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveExpense } from "@/lib/actions/expenses";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
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
  const t = useT();

  useEffect(() => {
    if (state?.success) {
      show(expense ? t("expense.updated") : t("expense.added"));
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={expense ? t("expense.edit") : t("expense.add")}>
      <form action={formAction} className="space-y-4">
        {expense && <input type="hidden" name="id" value={expense.id} />}

        <div>
          <Label htmlFor="payee">{t("field.payee")}</Label>
          <Input id="payee" name="payee" defaultValue={expense?.payee} placeholder={t("expense.payeePlaceholder")} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">{t("field.category")}</Label>
            <Select id="category" name="category" defaultValue={expense?.category ?? "other"}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`expenseCat.${c}` as MessageKey)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="date">{t("field.date")}</Label>
            <Input id="date" name="date" type="date" defaultValue={expense?.date ?? new Date().toISOString().slice(0, 10)} />
          </div>
        </div>

        <div>
          <Label htmlFor="description">{t("field.description")}</Label>
          <Input id="description" name="description" defaultValue={expense?.description ?? ""} placeholder={t("expense.descPlaceholder")} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">{t("field.amountDollar")}</Label>
            <Input id="amount" name="amount" type="number" min={0} step="0.01" defaultValue={expense?.amount ?? 0} required />
          </div>
          <div>
            <Label htmlFor="method">{t("field.method")}</Label>
            <Select id="method" name="method" defaultValue={expense?.method ?? "cash"}>
              <option value="cash">{t("method.cash")}</option>
              <option value="mobile_money">{t("method.mobile_money")}</option>
              <option value="bank_transfer">{t("method.bank_transfer")}</option>
              <option value="other">{t("method.other")}</option>
            </Select>
          </div>
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
