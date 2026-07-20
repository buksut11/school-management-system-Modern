"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setFeeInstallments, type InstallmentInput } from "@/lib/actions/fees";
import { useToast } from "@/components/ui/toast";
import type { FeeInstallment } from "@/lib/data/fees";

export function InstallmentsModal({
  open,
  onClose,
  year,
  installments,
}: {
  open: boolean;
  onClose: () => void;
  year: { id: string; name: string };
  installments: FeeInstallment[];
}) {
  const [rows, setRows] = useState<InstallmentInput[]>(
    installments.length
      ? installments.map((i) => ({ name: i.name, due_date: i.due_date, percent: i.percent }))
      : [{ name: "Term 1", due_date: "", percent: 0 }]
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  const total = rows.reduce((sum, r) => sum + (Number(r.percent) > 0 ? Number(r.percent) : 0), 0);

  function update(index: number, patch: Partial<InstallmentInput>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await setFeeInstallments(year.id, rows);
      if (result?.error) {
        setError(result.error);
        return;
      }
      show("Payment schedule saved");
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Payment schedule — ${year.name}`} widthClass="max-w-xl">
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-2">
          Each installment is a percentage of every student&apos;s own annual fee (after any
          discount). Once a due date passes, students who haven&apos;t covered it show as overdue.
          Only finance or admin accounts can change the schedule.
        </p>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_150px_90px_32px] gap-2 text-[11.5px] font-medium text-text-2 px-0.5">
            <span>Name</span>
            <span>Due date</span>
            <span>Percent</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_150px_90px_32px] gap-2 items-center">
              <Input
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={`Term ${i + 1}`}
                aria-label="Installment name"
              />
              <Input
                type="date"
                value={row.due_date}
                onChange={(e) => update(i, { due_date: e.target.value })}
                aria-label="Due date"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={row.percent || ""}
                onChange={(e) => update(i, { percent: Number(e.target.value) })}
                placeholder="%"
                aria-label="Percent of annual fee"
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Remove installment"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setRows((prev) => [...prev, { name: `Term ${prev.length + 1}`, due_date: "", percent: 0 }])}
          >
            <Plus size={14} /> Add installment
          </Button>
          <span className={`text-[13px] font-medium ${total > 100 ? "text-red" : "text-text-2"}`}>
            Total: {total}%
          </span>
        </div>

        <div>
          <Label className="sr-only">Errors</Label>
          {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || total > 100}>
            {pending ? "Saving…" : "Save schedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
