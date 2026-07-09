"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useIsCompact } from "@/lib/use-media-query";
import { AttendanceTable } from "./attendance-table";
import { AttendanceGrid } from "./attendance-grid";
import { setAttendance } from "@/lib/actions/attendance";
import { downloadCsv } from "@/lib/csv";
import type { AttendanceRow } from "@/lib/data/attendance";

export function AttendanceView({
  date,
  rows: initialRows,
  classes,
}: {
  date: string;
  rows: AttendanceRow[];
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const isCompact = useIsCompact();
  const activeView = isCompact ? "grid" : view;
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      if (query.trim() && !r.full_name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, classFilter, query]);

  const present = rows.filter((r) => r.status === "present").length;
  const late = rows.filter((r) => r.status === "late").length;
  const absent = rows.filter((r) => r.status === "absent").length;

  function onChange(studentId: string, status: "present" | "late" | "absent") {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
    setPendingId(studentId);
    startTransition(async () => {
      await setAttendance(studentId, date, status);
      setPendingId(null);
      router.refresh();
    });
  }

  function exportCsv() {
    downloadCsv(
      "attendance.csv",
      filtered.map((r) => ({
        student: r.full_name,
        class: r.class_name ?? "",
        date,
        status: r.status,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Present" value={present} color="var(--green)" />
        <Stat label="Late" value={late} color="var(--orange)" />
        <Stat label="Absent" value={absent} color="var(--red)" />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={classFilter}
          onChange={setClassFilter}
          options={[{ value: "all", label: "All" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => router.push(`/attendance?date=${e.target.value}`)}
          className="h-10 rounded-xl px-3 text-[13.5px] bg-input border border-transparent focus:bg-solid focus:border-blue/30 focus:ring-4 focus:ring-blue-soft transition-all"
        />
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
            className="pl-9"
          />
        </div>
        {!isCompact && <ViewToggle view={view} onChange={setView} />}
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
      </div>

      {activeView === "list" ? (
        <AttendanceTable rows={filtered} onChange={onChange} pendingId={pendingId} />
      ) : (
        <AttendanceGrid rows={filtered} onChange={onChange} pendingId={pendingId} />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-3.5 text-center">
      <div className="text-[20px] font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-[11.5px] text-text-2">{label}</div>
    </Card>
  );
}
