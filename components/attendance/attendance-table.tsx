"use client";

import { Avatar } from "@/components/ui/avatar";
import { StatusPills } from "./status-pills";
import type { AttendanceRow } from "@/lib/data/attendance";

export function AttendanceTable({
  rows,
  onChange,
  pendingId,
}: {
  rows: AttendanceRow[];
  onChange: (studentId: string, status: "present" | "late" | "absent") => void;
  pendingId: string | null;
}) {
  return (
    <div className="r-table att-table rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="r-head flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold text-text-2 uppercase tracking-wide">
        <div className="flex-1 min-w-[160px]">Student</div>
        <div className="w-28 flex-none acol-date">Class</div>
        <div className="w-[220px] flex-none text-right">Status</div>
      </div>

      <div className="divide-y divide-line/60">
        {rows.map((r) => (
          <div key={r.student_id} className="r-card flex items-center gap-3 px-5 py-3">
            <div className="r-ident r-cell flex-1 min-w-[160px] flex items-center gap-2.5">
              <Avatar name={r.full_name} photoUrl={r.photo_url} size={32} />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">{r.full_name}</div>
                <div className="text-[11.5px] text-text-2 truncate">{r.class_name ?? "—"}</div>
              </div>
            </div>
            <div className="r-cell acol-date w-28 flex-none text-[13px] text-text-2" data-label="Class">
              {r.class_name ?? "—"}
            </div>
            <div className="r-cell w-[220px] flex-none flex justify-end" data-label="Status">
              <StatusPills
                value={r.status}
                onChange={(v) => onChange(r.student_id, v)}
                disabled={pendingId === r.student_id}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No students found.</div>
        )}
      </div>
    </div>
  );
}
