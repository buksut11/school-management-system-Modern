"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import type { StudentWithClass } from "@/lib/data/students";

const STATUS_TONE = { present: "green", late: "orange", absent: "red" } as const;

export function StudentsTable({
  students,
  onEdit,
  onDelete,
}: {
  students: StudentWithClass[];
  onEdit: (s: StudentWithClass) => void;
  onDelete: (s: StudentWithClass) => void;
}) {
  return (
    <div className="r-table students-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="w-20 flex-none">ID</div>
        <div className="flex-1 min-w-[160px]">Student</div>
        <div className="w-24 flex-none">Class</div>
        <div className="w-36 flex-none lcol-pmob">Parent Mobile</div>
        <div className="w-32 flex-none lcol-smob">Mobile</div>
        <div className="w-28 flex-none lcol-dob">DOB</div>
        <div className="w-20 flex-none lcol-fees">Fees</div>
        <div className="w-24 flex-none">Status</div>
        <div className="w-20 flex-none text-right">Actions</div>
      </div>

      <div className="divide-y divide-line/60">
        {students.map((s) => (
          <div key={s.id} className="r-card flex items-center gap-3 px-5 py-3" style={{ opacity: s.status === "inactive" ? 0.55 : 1 }}>
            <div className="r-cell w-20 flex-none" data-label="ID">
              <Badge tone="blue">STU-{1000 + s.seq}</Badge>
            </div>
            <div className="r-ident r-cell flex-1 min-w-[160px] flex items-center gap-2.5">
              <Avatar name={s.full_name} photoUrl={s.photo_url} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate flex items-center gap-1.5">
                  {s.full_name}
                  {s.status === "inactive" && <Badge tone="gray">Inactive</Badge>}
                </div>
                <div className="text-[11.5px] text-text-2 truncate">{s.class_name ?? "—"}</div>
              </div>
            </div>
            <div className="r-cell s-classcell w-24 flex-none text-[13px] text-text-2" data-label="Class">
              {s.class_name ?? "—"}
            </div>
            <div className="r-cell lcol-pmob w-36 flex-none text-[13px] text-text-2 truncate" data-label="Parent Mobile">
              {s.parent_mobile ?? "—"}
            </div>
            <div className="r-cell lcol-smob w-32 flex-none text-[13px] text-text-2 truncate" data-label="Mobile">
              {s.mobile ?? "—"}
            </div>
            <div className="r-cell lcol-dob w-28 flex-none text-[13px] text-text-2" data-label="DOB">
              {s.dob ? formatDate(s.dob) : "—"}
            </div>
            <div className="r-cell lcol-fees w-20 flex-none text-[13px] text-text-2" data-label="Fees">
              {formatMoney(s.base_fees)}
            </div>
            <div className="r-cell w-24 flex-none" data-label="Status">
              {s.today_status ? (
                <Badge tone={STATUS_TONE[s.today_status]}>
                  {s.today_status[0].toUpperCase() + s.today_status.slice(1)}
                </Badge>
              ) : (
                <Badge tone="gray">—</Badge>
              )}
            </div>
            <div className="r-actions w-20 flex-none flex items-center justify-end gap-1">
              <button
                onClick={() => onEdit(s)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(s)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No students found.</div>
        )}
      </div>
    </div>
  );
}
