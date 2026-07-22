"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { TeacherWithClass } from "@/lib/data/teachers";

export function TeachersTable({
  teachers,
  onEdit,
  onDelete,
}: {
  teachers: TeacherWithClass[];
  onEdit: (t: TeacherWithClass) => void;
  onDelete: (t: TeacherWithClass) => void;
}) {
  const t = useT();
  return (
    <div className="r-table teachers-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="w-20 flex-none">{t("col.id")}</div>
        <div className="flex-1 min-w-[160px]">{t("col.teacher")}</div>
        <div className="w-24 flex-none">{t("col.class")}</div>
        <div className="w-36 flex-none tcol-subj">{t("col.subjects")}</div>
        <div className="w-28 flex-none tcol-mob">{t("col.mobile")}</div>
        <div className="w-24 flex-none">{t("col.status")}</div>
        <div className="w-20 flex-none text-right">{t("col.actions")}</div>
      </div>

      <div className="divide-y divide-line/60">
        {teachers.map((tc) => (
          <div key={tc.id} className="r-card flex items-center gap-3 px-5 py-3" style={{ opacity: tc.status === "inactive" ? 0.55 : 1 }}>
            <div className="r-cell w-20 flex-none" data-label={t("col.id")}>
              <Badge tone="purple">TCH-{100 + tc.seq}</Badge>
            </div>
            <div className="r-ident r-cell flex-1 min-w-[160px] flex items-center gap-2.5">
              <Avatar name={tc.full_name} photoUrl={tc.photo_url} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                  {tc.full_name}
                  {tc.status === "inactive" && <Badge tone="gray">{t("status.inactive")}</Badge>}
                </div>
                <div className="text-[11.5px] text-text-2 truncate">{tc.class_name ?? t("common.unassigned")}</div>
              </div>
            </div>
            <div className="r-cell s-classcell w-24 flex-none text-[13px] text-text-2" data-label={t("col.class")}>
              {tc.class_name ?? "—"}
            </div>
            <div className="r-cell tcol-subj w-36 flex-none text-[13px] text-text-2 truncate" data-label={t("col.subjects")}>
              {tc.subjects.length ? tc.subjects.join(", ") : "—"}
            </div>
            <div className="r-cell tcol-mob w-28 flex-none text-[13px] text-text-2 truncate" data-label={t("col.mobile")}>
              {tc.mobile ?? "—"}
            </div>
            <div className="r-cell w-24 flex-none" data-label={t("col.status")}>
              <Badge tone={tc.status === "active" ? "green" : "gray"}>
                {tc.status === "active" ? t("status.active") : t("status.inactive")}
              </Badge>
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(tc)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label={t("common.edit")}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(tc)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label={t("common.delete")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {teachers.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">{t("teacher.notFound")}</div>
        )}
      </div>
    </div>
  );
}
