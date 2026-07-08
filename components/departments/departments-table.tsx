"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DepartmentRow } from "@/lib/data/academics";

export function DepartmentsTable({
  departments,
  onEdit,
  onDelete,
}: {
  departments: DepartmentRow[];
  onEdit: (d: DepartmentRow) => void;
  onDelete: (d: DepartmentRow) => void;
}) {
  return (
    <div className="r-table dept-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="w-20 flex-none">ID</div>
        <div className="flex-1 min-w-[160px]">Department</div>
        <div className="w-36 flex-none dcol-head">Head</div>
        <div className="w-24 flex-none dcol-subj">Subjects</div>
        <div className="w-24 flex-none dcol-teachers">Teachers</div>
        <div className="w-24 flex-none dcol-periods">Periods/wk</div>
        <div className="w-20 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {departments.map((d) => (
          <div key={d.id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-cell w-20 flex-none" data-label="ID">
              <Badge tone="purple">DEP-{String(d.seq).padStart(2, "0")}</Badge>
            </div>
            <div className="r-ident r-cell flex-1 min-w-[160px] text-[13.5px] font-medium">{d.name}</div>
            <div className="r-cell dcol-head w-36 flex-none text-[13px] text-text-2 truncate" data-label="Head">
              {d.head_teacher_name ?? "Unassigned"}
            </div>
            <div className="r-cell dcol-subj w-24 flex-none text-[13px] text-text-2" data-label="Subjects">
              {d.subject_count}
            </div>
            <div className="r-cell dcol-teachers w-24 flex-none text-[13px] text-text-2" data-label="Teachers">
              {d.teacher_count}
            </div>
            <div className="r-cell dcol-periods w-24 flex-none text-[13px] text-text-2" data-label="Periods/wk">
              {d.periods_per_week}
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(d)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(d)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No departments found.</div>
        )}
      </div>
    </div>
  );
}
