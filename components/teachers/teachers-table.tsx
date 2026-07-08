"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  return (
    <div className="r-table teachers-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="w-20 flex-none">ID</div>
        <div className="flex-1 min-w-[160px]">Teacher</div>
        <div className="w-24 flex-none">Class</div>
        <div className="w-40 flex-none tcol-subj">Subjects</div>
        <div className="w-32 flex-none tcol-mob">Mobile</div>
        <div className="w-24 flex-none">Status</div>
        <div className="w-20 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {teachers.map((t) => (
          <div key={t.id} className="r-card flex items-center gap-3 px-5 py-3" style={{ opacity: t.status === "inactive" ? 0.55 : 1 }}>
            <div className="r-cell w-20 flex-none" data-label="ID">
              <Badge tone="purple">TCH-{100 + t.seq}</Badge>
            </div>
            <div className="r-ident r-cell flex-1 min-w-[160px] flex items-center gap-2.5">
              <Avatar name={t.full_name} photoUrl={t.photo_url} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                  {t.full_name}
                  {t.status === "inactive" && <Badge tone="gray">Inactive</Badge>}
                </div>
                <div className="text-[11.5px] text-text-2 truncate">{t.class_name ?? "Unassigned"}</div>
              </div>
            </div>
            <div className="r-cell w-24 flex-none text-[13px] text-text-2" data-label="Class">
              {t.class_name ?? "—"}
            </div>
            <div className="r-cell tcol-subj w-40 flex-none text-[13px] text-text-2 truncate" data-label="Subjects">
              {t.subjects.length ? t.subjects.join(", ") : "—"}
            </div>
            <div className="r-cell tcol-mob w-32 flex-none text-[13px] text-text-2 truncate" data-label="Mobile">
              {t.mobile ?? "—"}
            </div>
            <div className="r-cell w-24 flex-none" data-label="Status">
              <Badge tone={t.status === "active" ? "green" : "gray"}>
                {t.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(t)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(t)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {teachers.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No teachers found.</div>
        )}
      </div>
    </div>
  );
}
