"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { StudentWithClass } from "@/lib/data/students";

const STATUS_TONE = { present: "green", late: "orange", absent: "red" } as const;

export function StudentsGrid({
  students,
  onEdit,
  onDelete,
}: {
  students: StudentWithClass[];
  onEdit: (s: StudentWithClass) => void;
  onDelete: (s: StudentWithClass) => void;
}) {
  if (students.length === 0) {
    return (
      <Card className="py-12 text-center text-[13px] text-text-2">No students found.</Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((s) => (
        <Card key={s.id} className="p-4" style={{ opacity: s.status === "active" ? 1 : 0.6 }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={s.full_name} photoUrl={s.photo_url} size={40} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{s.full_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">STU-{1000 + s.seq}</div>
              </div>
            </div>
            {s.today_status && (
              <Badge tone={STATUS_TONE[s.today_status]}>
                {s.today_status[0].toUpperCase() + s.today_status.slice(1)}
              </Badge>
            )}
          </div>
          <div className="space-y-1 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>Class</span>
              <span className="text-text font-medium">{s.class_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Parent mobile</span>
              <span className="text-text font-medium">{s.parent_mobile ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Fees</span>
              <span className="text-text font-medium">{formatMoney(s.base_fees)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status</span>
              <Badge tone={s.status === "active" ? "green" : s.status === "graduated" ? "blue" : "gray"}>
                {s.status === "active" ? "Active" : s.status === "graduated" ? "Graduated" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(s)}
              className="flex-1 h-8 rounded-lg bg-card-2 hover:bg-hover text-[12.5px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(s)}
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
