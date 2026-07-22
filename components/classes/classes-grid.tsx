"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { OccupancyBar } from "./occupancy-bar";
import { useT } from "@/lib/i18n/client";
import type { ClassWithStats } from "@/lib/data/classes";

export function ClassesGrid({
  classes,
  onEdit,
  onDelete,
}: {
  classes: ClassWithStats[];
  onEdit: (c: ClassWithStats) => void;
  onDelete: (c: ClassWithStats) => void;
}) {
  const t = useT();
  if (classes.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">{t("class.notFound")}</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((c) => (
        <Card key={c.id} className="p-4">
          <div className="mb-3">
            <div className="text-[14.5px] font-semibold">{c.name}</div>
            <div className="text-[11.5px] text-text-2">{c.room ?? t("class.noRoom")}</div>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>{t("field.classTeacher")}</span>
              <span className="text-text font-medium">{c.teacher_name ?? t("common.unassigned")}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("col.enrolled")}</span>
              <span className="text-text font-medium">
                {c.enrolled} ({c.boys}B / {c.girls}G)
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("col.fees")}</span>
              <span className="text-text font-medium">{formatMoney(c.base_fees)}</span>
            </div>
            <div className="pt-1">
              <OccupancyBar enrolled={c.enrolled} capacity={c.capacity} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(c)}
              className="flex-1 h-8 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} /> {t("common.edit")}
            </button>
            <button
              onClick={() => onDelete(c)}
              className="flex-1 h-8 rounded-lg bg-red/10 hover:bg-red/20 text-red text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> {t("common.delete")}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
