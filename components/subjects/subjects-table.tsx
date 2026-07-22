"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { SubjectRow } from "@/lib/data/academics";

export function SubjectsTable({
  subjects,
  onEdit,
  onDelete,
}: {
  subjects: SubjectRow[];
  onEdit: (s: SubjectRow) => void;
  onDelete: (s: SubjectRow) => void;
}) {
  const t = useT();
  return (
    <div className="r-table subj-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="w-20 flex-none">{t("col.id")}</div>
        <div className="flex-1 min-w-[150px]">{t("col.subject")}</div>
        <div className="w-32 flex-none scol-dept">{t("col.department")}</div>
        <div className="w-16 flex-none scol-type">{t("col.type")}</div>
        <div className="w-24 flex-none scol-periods">{t("subject.statPeriods")}</div>
        <div className="w-20 flex-none text-right">{t("col.actions")}</div>
      </div>

      <div className="divide-y divide-line/60">
        {subjects.map((s) => (
          <div key={s.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-cell w-20 flex-none" data-label={t("col.id")}>
              <Badge tone="teal">SUB-{String(s.seq).padStart(2, "0")}</Badge>
            </div>
            <div className="r-ident r-cell flex-1 min-w-[150px]">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">{s.name}</div>
                <div className="text-[11.5px] text-text-2 truncate">{s.teacher_name ?? t("common.unassigned")}</div>
              </div>
            </div>
            <div className="r-cell scol-dept w-32 flex-none text-[13px] text-text-2 truncate" data-label={t("col.department")}>
              {s.department_name ?? "—"}
            </div>
            <div className="r-cell scol-type w-16 flex-none" data-label={t("col.type")}>
              <Badge tone={s.type === "core" ? "blue" : "gray"}>{s.type === "core" ? t("type.core") : t("type.elective")}</Badge>
            </div>
            <div className="r-cell scol-periods w-24 flex-none text-[13px] text-text-2" data-label={t("subject.statPeriods")}>
              {s.periods_per_week}
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(s)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("common.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(s)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label={t("common.delete")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {subjects.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">{t("subject.notFound")}</div>
        )}
      </div>
    </div>
  );
}
