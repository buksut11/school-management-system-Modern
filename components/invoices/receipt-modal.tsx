"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveReceipt } from "@/lib/actions/invoices";
import { useToast } from "@/components/ui/toast";
import { EMPTY_PARTY, PartyFields, type PartyState, type TeacherOption } from "./party-fields";
import type { StudentOption } from "@/lib/data/invoices";

/** Standalone receipt — a payment not tied to any invoice (e.g. paying the
 *  watchman's wages, or a walk-in fee payment). */
export function ReceiptModal({
  open,
  onClose,
  students,
  teachers,
}: {
  open: boolean;
  onClose: () => void;
  students: StudentOption[];
  teachers: TeacherOption[];
}) {
  const [state, formAction, pending] = useActionState(saveReceipt, undefined);
  const { show } = useToast();
  const [party, setParty] = useState<PartyState>(EMPTY_PARTY);

  useEffect(() => {
    if (state?.success) {
      show("Receipt created");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="New Receipt">
      <form action={formAction} className="space-y-4">
        <PartyFields party={party} onChange={setParty} students={students} teachers={teachers} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input id="amount" name="amount" type="number" min={0.01} step="0.01" required />
          </div>
          <div>
            <Label htmlFor="received_date">Date</Label>
            <Input
              id="received_date"
              name="received_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
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
          <Label htmlFor="note">Description (optional)</Label>
          <Input
            id="note"
            name="note"
            placeholder={
              party.type === "student" ? "e.g. Term 1 fees installment" : "e.g. June salary"
            }
          />
        </div>

        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create Receipt"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
