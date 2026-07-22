"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveInvoice } from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/utils";
import { EMPTY_PARTY, PartyFields, type PartyState, type TeacherOption } from "./party-fields";
import type { InvoiceRow, StudentOption } from "@/lib/data/invoices";

type ItemDraft = { description: string; qty: string; unit_price: string };

const EMPTY_ITEM: ItemDraft = { description: "", qty: "1", unit_price: "" };

export function InvoiceModal({
  open,
  onClose,
  onSaved,
  invoice,
  students,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  invoice: InvoiceRow | null;
  students: StudentOption[];
  teachers: TeacherOption[];
}) {
  const [state, formAction, pending] = useActionState(saveInvoice, undefined);
  const { show } = useToast();
  const t = useT();

  const [party, setParty] = useState<PartyState>(
    invoice
      ? {
          type: invoice.party_type,
          id: invoice.party_id,
          name: invoice.party_name,
          detail: invoice.party_detail ?? "",
          phone: invoice.party_phone ?? "",
          address: invoice.party_address ?? "",
          parentName: invoice.parent_name ?? "",
          parentPhone: invoice.parent_phone ?? "",
        }
      : EMPTY_PARTY
  );
  const [items, setItems] = useState<ItemDraft[]>(
    invoice && invoice.items.length > 0
      ? invoice.items.map((it) => ({
          description: it.description,
          qty: String(it.qty),
          unit_price: String(it.unit_price),
        }))
      : [{ ...EMPTY_ITEM }]
  );

  useEffect(() => {
    if (state?.success) {
      show(invoice ? t("invoice.updated") : t("invoice.created"));
      onSaved?.();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const total = items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unit_price) || 0),
    0
  );

  function setItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function prefillFees(s: StudentOption) {
    // Only offer the shortcut while the item list is still untouched.
    setItems((prev) =>
      prev.length === 1 && !prev[0].description && !prev[0].unit_price && s.base_fees > 0
        ? [{ description: "Term fees", qty: "1", unit_price: String(s.base_fees) }]
        : prev
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? t("invoice.editTitle", { no: invoice.invoice_no }) : t("invoice.new")}
      widthClass="max-w-2xl"
    >
      <form action={formAction} className="space-y-4">
        {invoice && <input type="hidden" name="id" value={invoice.id} />}

        <PartyFields
          party={party}
          onChange={setParty}
          students={students}
          teachers={teachers}
          onStudentPick={prefillFees}
        />

        <div>
          <Label>{t("invoice.lineItems")}</Label>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={it.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  placeholder={
                    party.type === "student" ? t("invoice.itemPlaceholderStudent") : t("invoice.itemPlaceholderStaff")
                  }
                  className="flex-1"
                />
                <Input
                  value={it.qty}
                  onChange={(e) => setItem(i, { qty: e.target.value })}
                  type="number"
                  min={1}
                  step="1"
                  aria-label={t("invoice.quantity")}
                  className="w-16 flex-none"
                />
                <Input
                  value={it.unit_price}
                  onChange={(e) => setItem(i, { unit_price: e.target.value })}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  aria-label={t("invoice.unitPrice")}
                  className="w-24 flex-none"
                />
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                  disabled={items.length === 1}
                  className="w-8 h-8 flex-none rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  aria-label={t("invoice.removeLine")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
              className="text-[12.5px] text-blue hover:underline inline-flex items-center gap-1"
            >
              <Plus size={13} /> {t("invoice.addLine")}
            </button>
            <div className="text-[13px]">
              <span className="text-text-2">{t("invoice.totalLabel")} </span>
              <span className="font-semibold">{formatMoney(total)}</span>
            </div>
          </div>
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              items.map((it) => ({
                description: it.description.trim(),
                qty: Number(it.qty),
                unit_price: Number(it.unit_price),
              }))
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="issued_date">{t("field.issued")}</Label>
            <Input
              id="issued_date"
              name="issued_date"
              type="date"
              defaultValue={invoice?.issued_date ?? new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <Label htmlFor="due_date">{t("field.dueOptional")}</Label>
            <Input id="due_date" name="due_date" type="date" defaultValue={invoice?.due_date ?? ""} />
          </div>
        </div>

        <div>
          <Label htmlFor="note">{t("field.noteOptional")}</Label>
          <Input
            id="note"
            name="note"
            defaultValue={invoice?.note ?? ""}
            placeholder={t("invoice.notePlaceholder")}
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
            {pending ? t("common.saving") : invoice ? t("invoice.saveChanges") : t("invoice.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
