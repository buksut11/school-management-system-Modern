"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusPills } from "./status-pills";
import { useT } from "@/lib/i18n/client";
import type { AttendanceRow } from "@/lib/data/attendance";

const BORDER = { present: "var(--green)", late: "var(--orange)", absent: "var(--red)" };

export function AttendanceGrid({
  rows,
  onChange,
  pendingId,
}: {
  rows: AttendanceRow[];
  onChange: (studentId: string, status: "present" | "late" | "absent") => void;
  pendingId: string | null;
}) {
  const t = useT();
  if (rows.length === 0) {
    return <Card className="py-12 text-center text-[13px] text-text-2">{t("student.notFound")}</Card>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((r) => (
        <Card
          key={r.student_id}
          className="p-4 border-l-4"
          style={{ borderLeftColor: BORDER[r.status] }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Avatar name={r.full_name} photoUrl={r.photo_url} size={38} />
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium truncate">{r.full_name}</div>
              <div className="text-[11.5px] text-text-2 truncate">{r.class_name ?? "—"}</div>
            </div>
          </div>
          <StatusPills
            value={r.status}
            onChange={(v) => onChange(r.student_id, v)}
            disabled={pendingId === r.student_id}
          />
        </Card>
      ))}
    </div>
  );
}
