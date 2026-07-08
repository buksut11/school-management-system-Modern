"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  if (teachers.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">No teachers found.</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {teachers.map((t) => (
        <Card key={t.id} className="p-4" style={{ opacity: t.status === "inactive" ? 0.6 : 1 }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={t.full_name} photoUrl={t.photo_url} size={40} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{t.full_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">TCH-{100 + t.seq}</div>
              </div>
            </div>
            <Badge tone={t.status === "active" ? "green" : "gray"}>
              {t.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="space-y-1 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>Class</span>
              <span className="text-text font-medium">{t.class_name ?? "Unassigned"}</span>
            </div>
            <div className="flex justify-between">
              <span>Subjects</span>
              <span className="text-text font-medium truncate max-w-[60%] text-right">
                {t.subjects.length ? t.subjects.join(", ") : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Mobile</span>
              <span className="text-text font-medium">{t.mobile ?? "—"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(t)}
              className="flex-1 h-8 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(t)}
              className="flex-1 h-8 rounded-lg bg-red/10 hover:bg-red/20 text-red text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
