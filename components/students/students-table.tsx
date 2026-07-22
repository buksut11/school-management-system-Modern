"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { StudentWithClass } from "@/lib/data/students";

const STATUS_TONE = { present: "green", late: "orange", absent: "red" } as const;
const ATT_KEY = { present: "dash.present", late: "dash.late", absent: "dash.absent" } as const;

export function StudentsTable({
  students,
  onEdit,
  onDelete,
}: {
  students: StudentWithClass[];
  onEdit: (s: StudentWithClass) => void;
  onDelete: (s: StudentWithClass) => void;
}) {
  const t = useT();
  return (
    <div className="r-table students-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="w-20 flex-none">{t("col.id")}</div>
        <div className="flex-1 min-w-[160px]">{t("col.student")}</div>
        <div className="w-24 flex-none">{t("col.class")}</div>
        <div className="w-28 flex-none lcol-pmob">{t("col.parentMobile")}</div>
        <div className="w-28 flex-none lcol-smob">{t("col.mobile")}</div>
        <div className="w-24 flex-none lcol-dob">{t("col.dob")}</div>
        <div className="w-20 flex-none lcol-fees">{t("col.fees")}</div>
        <div className="w-24 flex-none lcol-att">{t("col.attendance")}</div>
        <div className="w-24 flex-none">{t("col.status")}</div>
        <div className="w-20 flex-none text-right">{t("col.actions")}</div>
      </div>

      <div className="divide-y divide-line/60">
        {students.map((s) => (
          <div key={s.id} className="r-card flex items-center gap-3 px-5 py-3" style={{ opacity: s.status === "active" ? 1 : 0.55 }}>
            <div className="r-cell w-20 flex-none" data-label={t("col.id")}>
              <Badge tone="blue">STU-{1000 + s.seq}</Badge>
            </div>
            <div className="r-ident r-cell flex-1 min-w-[160px] flex items-center gap-2.5">
              <Avatar name={s.full_name} photoUrl={s.photo_url} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{s.full_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">{s.class_name ?? "—"}</div>
              </div>
            </div>
            <div className="r-cell s-classcell w-24 flex-none text-[13px] text-text-2" data-label={t("col.class")}>
              {s.class_name ?? "—"}
            </div>
            <div className="r-cell lcol-pmob w-28 flex-none text-[13px] text-text-2 truncate" data-label={t("col.parentMobile")}>
              {s.parent_mobile ?? "—"}
            </div>
            <div className="r-cell lcol-smob w-28 flex-none text-[13px] text-text-2 truncate" data-label={t("col.mobile")}>
              {s.mobile ?? "—"}
            </div>
            <div className="r-cell lcol-dob w-24 flex-none text-[13px] text-text-2" data-label={t("col.dob")}>
              {s.dob ? formatDate(s.dob) : "—"}
            </div>
            <div className="r-cell lcol-fees w-20 flex-none text-[13px] text-text-2" data-label={t("col.fees")}>
              {formatMoney(s.base_fees)}
            </div>
            <div className="r-cell lcol-att w-24 flex-none" data-label={t("col.attendance")}>
              {s.today_status ? (
                <Badge tone={STATUS_TONE[s.today_status]}>{t(ATT_KEY[s.today_status])}</Badge>
              ) : (
                <Badge tone="gray">—</Badge>
              )}
            </div>
            <div className="r-cell w-24 flex-none" data-label={t("col.status")}>
              <Badge tone={s.status === "active" ? "green" : s.status === "graduated" ? "blue" : "gray"}>
                {s.status === "active" ? t("status.active") : s.status === "graduated" ? t("status.graduated") : t("status.inactive")}
              </Badge>
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
        {students.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">{t("student.notFound")}</div>
        )}
      </div>
    </div>
  );
}
