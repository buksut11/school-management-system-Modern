"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import type { TeacherWithClass } from "@/lib/data/teachers";

export function TeachersGrid({
  teachers,
  onEdit,
  onDelete,
}: {
  teachers: TeacherWithClass[];
  onEdit: (t: TeacherWithClass) => void;
  onDelete: (t: TeacherWithClass) => void;
}) {
  const t = useT();
  if (teachers.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">{t("teacher.notFound")}</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {teachers.map((tc) => (
        <Card key={tc.id} className="p-4" style={{ opacity: tc.status === "inactive" ? 0.6 : 1 }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={tc.full_name} photoUrl={tc.photo_url} size={40} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{tc.full_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">TCH-{100 + tc.seq}</div>
              </div>
            </div>
            <Badge tone={tc.status === "active" ? "green" : "gray"}>
              {tc.status === "active" ? t("status.active") : t("status.inactive")}
            </Badge>
          </div>
          <div className="space-y-1 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>{t("col.class")}</span>
              <span className="text-text font-medium">{tc.class_name ?? t("common.unassigned")}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("col.subjects")}</span>
              <span className="text-text font-medium truncate max-w-[60%] text-right">
                {tc.subjects.length ? tc.subjects.join(", ") : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("col.mobile")}</span>
              <span className="text-text font-medium">{tc.mobile ?? "—"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(tc)}
              className="flex-1 h-8 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} /> {t("common.edit")}
            </button>
            <button
              onClick={() => onDelete(tc)}
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
