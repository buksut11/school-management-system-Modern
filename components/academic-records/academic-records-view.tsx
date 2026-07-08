"use client";

import { useMemo, useState } from "react";
import { Search, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { downloadCsv } from "@/lib/csv";

type AcademicRecordRow = {
  student_id: string;
  student_name: string;
  class_id: string | null;
  class_name: string | null;
  term1: number | null;
  term2: number | null;
  term3: number | null;
  average: number;
  grade: string;
  trend: "up" | "down" | "flat";
};

const GRADE_TONE: Record<string, "green" | "blue" | "orange" | "red"> = {
  A: "green",
  B: "blue",
  C: "orange",
  D: "orange",
  F: "red",
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };
const TREND_COLOR = { up: "text-green", down: "text-red", flat: "text-text-2" };

export function AcademicRecordsView({
  records,
  classes,
}: {
  records: AcademicRecordRow[];
  classes: { id: string; name: string }[];
}) {
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      if (query.trim() && !r.student_name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [records, classFilter, query]);

  function exportCsv() {
    downloadCsv(
      "academic-records.csv",
      filtered.map((r) => ({
        student: r.student_name,
        class: r.class_name ?? "",
        term1: r.term1 ?? "",
        term2: r.term2 ?? "",
        term3: r.term3 ?? "",
        average: r.average,
        grade: r.grade,
        trend: r.trend,
      }))
    );
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={classFilter}
          onChange={setClassFilter}
          options={[{ value: "all", label: "All" }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
            className="pl-9"
          />
        </div>
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> Export
        </Button>
      </div>

      <div className="rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]" style={{ minWidth: 720 }}>
            <thead>
              <tr className="text-[11px] font-semibold text-text-2 uppercase tracking-wide">
                <th className="text-left px-5 py-3 border-b border-line min-w-[190px]">Student</th>
                <th className="px-3 py-3 border-b border-line text-center min-w-[90px]">Term 1</th>
                <th className="px-3 py-3 border-b border-line text-center min-w-[90px]">Term 2</th>
                <th className="px-3 py-3 border-b border-line text-center min-w-[90px]">Term 3</th>
                <th className="px-3 py-3 border-b border-line text-center min-w-[90px] bg-card-2/50">Average</th>
                <th className="px-3 py-3 border-b border-line text-center min-w-[70px]">Grade</th>
                <th className="px-3 py-3 border-b border-line text-center min-w-[70px]">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((r) => {
                const TrendIcon = TREND_ICON[r.trend];
                return (
                  <tr key={r.student_id} className="hover:bg-hover/50 transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{r.student_name}</div>
                      <div className="text-[11px] text-text-2">{r.class_name ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-text-2">{r.term1 ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center text-text-2">{r.term2 ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center text-text-2">{r.term3 ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center font-semibold bg-card-2/50">{r.average}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge tone={GRADE_TONE[r.grade] ?? "gray"}>{r.grade}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <TrendIcon size={15} className={`mx-auto ${TREND_COLOR[r.trend]}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-text-2">
              No academic records yet — add exam scores first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
