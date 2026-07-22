"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveTimetableSlots, type SlotInput } from "@/lib/actions/timetable";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { TimetableSlot } from "@/lib/data/timetable";

export function SlotsModal({
  open,
  onClose,
  slots,
}: {
  open: boolean;
  onClose: () => void;
  slots: TimetableSlot[];
}) {
  const t = useT();
  const [rows, setRows] = useState<SlotInput[]>(
    slots.length
      ? slots.map((s) => ({
          id: s.id,
          name: s.name,
          starts_at: s.starts_at.slice(0, 5),
          ends_at: s.ends_at.slice(0, 5),
        }))
      : [{ name: t("tt.periodN", { n: 1 }), starts_at: "07:30", ends_at: "08:15" }]
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  const removedExisting = slots.some((s) => !rows.some((r) => r.id === s.id));

  function update(index: number, patch: Partial<SlotInput>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await saveTimetableSlots(rows);
      if (result?.error) {
        setError(result.error);
        return;
      }
      show(t("tt.gridSaved"));
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("tt.periodsTitle")} widthClass="max-w-xl">
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-2">{t("tt.periodsDesc")}</p>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_120px_120px_32px] gap-2 text-[11.5px] font-medium text-text-2 px-0.5">
            <span>{t("field.name")}</span>
            <span>{t("tt.starts")}</span>
            <span>{t("tt.ends")}</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={row.id ?? `new-${i}`} className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center">
              <Input
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={t("tt.periodN", { n: i + 1 })}
                aria-label={t("tt.periodName")}
              />
              <Input
                type="time"
                value={row.starts_at}
                onChange={(e) => update(i, { starts_at: e.target.value })}
                aria-label={t("tt.startTime")}
              />
              <Input
                type="time"
                value={row.ends_at}
                onChange={(e) => update(i, { ends_at: e.target.value })}
                aria-label={t("tt.endTime")}
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label={t("tt.removePeriod")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { name: t("tt.periodN", { n: prev.length + 1 }), starts_at: "", ends_at: "" },
            ])
          }
        >
          <Plus size={14} /> {t("tt.addPeriod")}
        </Button>

        {removedExisting && (
          <p className="text-[12.5px] text-orange bg-orange/10 rounded-lg px-3 py-2">
            {t("tt.removingWarn")}
          </p>
        )}
        {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? t("common.saving") : t("tt.savePeriods")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
