"use client";

import { Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { OccupancyBar } from "./occupancy-bar";
import { useT } from "@/lib/i18n/client";
import type { ClassWithStats } from "@/lib/data/classes";

export function ClassesTable({
  classes,
  onEdit,
  onDelete,
}: {
  classes: ClassWithStats[];
  onEdit: (c: ClassWithStats) => void;
  onDelete: (c: ClassWithStats) => void;
}) {
  const t = useT();
  return (
    <div className="r-table cls-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[140px]">{t("col.class")}</div>
        <div className="w-32 flex-none ccol-teacher">{t("col.classTeacher")}</div>
        <div className="w-16 flex-none ccol-boys">{t("col.boys")}</div>
        <div className="w-16 flex-none ccol-girls">{t("col.girls")}</div>
        <div className="w-28 flex-none ccol-occ">{t("col.occupancy")}</div>
        <div className="w-20 flex-none">{t("col.fees")}</div>
        <div className="w-20 flex-none text-right">{t("col.actions")}</div>
      </div>

      <div className="divide-y divide-line/60">
        {classes.map((c) => (
          <div key={c.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[140px]">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">{c.name}</div>
                <div className="text-[11.5px] text-text-2">{c.room ?? t("class.noRoom")} · {t("class.nStudents", { count: c.enrolled })}</div>
              </div>
            </div>
            <div className="r-cell ccol-teacher w-32 flex-none text-[13px] text-text-2 truncate" data-label={t("col.classTeacher")}>
              {c.teacher_name ?? t("common.unassigned")}
            </div>
            <div className="r-cell ccol-boys w-16 flex-none text-[13px] text-text-2" data-label={t("col.boys")}>
              {c.boys}
            </div>
            <div className="r-cell ccol-girls w-16 flex-none text-[13px] text-text-2" data-label={t("col.girls")}>
              {c.girls}
            </div>
            <div className="r-cell ccol-occ w-28 flex-none" data-label={t("col.occupancy")}>
              <OccupancyBar enrolled={c.enrolled} capacity={c.capacity} />
            </div>
            <div className="r-cell w-20 flex-none text-[13px] text-text-2" data-label={t("col.fees")}>
              {formatMoney(c.base_fees)}
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(c)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("common.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(c)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label={t("common.delete")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">{t("class.notFound")}</div>
        )}
      </div>
    </div>
  );
}
