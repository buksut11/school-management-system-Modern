"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { DepartmentRow } from "@/lib/data/academics";

export function DepartmentsGrid({
  departments,
  onEdit,
  onDelete,
}: {
  departments: DepartmentRow[];
  onEdit: (d: DepartmentRow) => void;
  onDelete: (d: DepartmentRow) => void;
}) {
  const t = useT();
  if (departments.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">{t("dept.notFound")}</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((d) => (
        <Card key={d.id} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[14.5px] font-semibold">{d.name}</div>
            <Badge tone="purple">DEP-{String(d.seq).padStart(2, "0")}</Badge>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>{t("col.head")}</span>
              <span className="text-text font-medium">{d.head_teacher_name ?? t("common.unassigned")}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("col.subjects")}</span>
              <span className="text-text font-medium">{d.subject_count}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("col.teachers")}</span>
              <span className="text-text font-medium">{d.teacher_count}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("subject.statPeriods")}</span>
              <span className="text-text font-medium">{d.periods_per_week}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(d)}
              className="flex-1 h-8 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} /> {t("common.edit")}
            </button>
            <button
              onClick={() => onDelete(d)}
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
