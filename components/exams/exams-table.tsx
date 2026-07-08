"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GRADEBOOK_SUBJECTS } from "@/lib/constants";
import type { ExamRow } from "@/lib/data/exams";

const GRADE_TONE: Record<string, "green" | "blue" | "orange" | "red"> = {
  A: "green",
  B: "blue",
  C: "orange",
  D: "orange",
  F: "red",
};

export function ExamsTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: ExamRow[];
  onEdit: (r: ExamRow) => void;
  onDelete: (r: ExamRow) => void;
}) {
  return (
    <div className="rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]" style={{ minWidth: 880 }}>
          <thead>
            <tr className="text-[11px] font-semibold text-text-2 uppercase tracking-wide">
              <th className="sticky left-0 z-10 bg-solid text-left px-5 py-3 border-b border-line min-w-[190px]">
                Student
              </th>
              {GRADEBOOK_SUBJECTS.map((s) => (
                <th key={s} className="px-3 py-3 border-b border-line text-center min-w-[76px]">
                  {s}
                </th>
              ))}
              <th className="px-3 py-3 border-b border-line text-center min-w-[70px]">Test</th>
              <th className="px-3 py-3 border-b border-line text-center min-w-[80px] bg-card-2/50">Total</th>
              <th className="px-3 py-3 border-b border-line text-center min-w-[60px]">Grade</th>
              <th className="px-3 py-3 border-b border-line text-right min-w-[90px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-hover/50 transition-colors">
                <td className="sticky left-0 z-10 bg-solid px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.student_name} photoUrl={r.photo_url} size={28} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.student_name}</div>
                      <div className="text-[11px] text-text-2 truncate">{r.class_name ?? "—"}</div>
                    </div>
                  </div>
                </td>
                {GRADEBOOK_SUBJECTS.map((s) => (
                  <td key={s} className="px-3 py-2.5 text-center text-text-2">
                    {r.subject_scores[s] ?? 0}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center text-text-2">{r.test_score}</td>
                <td className="px-3 py-2.5 text-center font-semibold bg-card-2/50">{r.total_score}</td>
                <td className="px-3 py-2.5 text-center">
                  <Badge tone={GRADE_TONE[r.grade] ?? "gray"}>{r.grade}</Badge>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(r)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-hover hover:text-blue transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-12 text-center text-[13px] text-text-2">No exam records for this term yet.</div>
        )}
      </div>
    </div>
  );
}
