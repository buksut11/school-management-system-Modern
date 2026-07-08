"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SubjectRow } from "@/lib/data/academics";

export function SubjectsGrid({
  subjects,
  onEdit,
  onDelete,
}: {
  subjects: SubjectRow[];
  onEdit: (s: SubjectRow) => void;
  onDelete: (s: SubjectRow) => void;
}) {
  if (subjects.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">No subjects found.</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((s) => (
        <Card key={s.id} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[14.5px] font-semibold">{s.name}</div>
              <div className="text-[11.5px] text-text-2">{s.department_name ?? "No department"}</div>
            </div>
            <Badge tone="teal">SUB-{String(s.seq).padStart(2, "0")}</Badge>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-text-2 mb-3">
            <div className="flex justify-between">
              <span>Teacher</span>
              <span className="text-text font-medium">{s.teacher_name ?? "Unassigned"}</span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <Badge tone={s.type === "core" ? "blue" : "gray"}>{s.type === "core" ? "Core" : "Elective"}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Periods/wk</span>
              <span className="text-text font-medium">{s.periods_per_week}</span>
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
