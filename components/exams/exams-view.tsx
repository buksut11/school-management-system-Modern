"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ExamsTable } from "./exams-table";
import { ExamModal } from "./exam-modal";
import { deleteExam } from "@/lib/actions/exams";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { TERMS } from "@/lib/constants";
import { GRADEBOOK_SUBJECTS } from "@/lib/constants";
import type { ExamRow } from "@/lib/data/exams";
import type { Term } from "@/lib/types/database";

export function ExamsView({
  term,
  rows,
  classes,
  eligibleStudents,
}: {
  term: Term;
  rows: ExamRow[];
  classes: { id: string; name: string }[];
  eligibleStudents: { id: string; full_name: string; class_id: string | null; class_name: string | null }[];
}) {
  const router = useRouter();
  const [classFilter, setClassFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamRow | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (classFilter !== "all" && r.class_id !== classFilter) return false;
      if (query.trim() && !r.student_name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [rows, classFilter, query]);

  async function onDelete(r: ExamRow) {
    const ok = await confirm({ title: `Remove ${r.student_name}'s ${term} record?`, confirmLabel: "Remove" });
    if (!ok) return;
    startTransition(async () => {
      await deleteExam(r.id, r.student_name);
      show("Exam record removed");
    });
  }

  function exportCsv() {
    downloadCsv(
      `exams-${term.replace(" ", "-").toLowerCase()}.csv`,
      filtered.map((r) => ({
        student: r.student_name,
        class: r.class_name ?? "",
        ...Object.fromEntries(GRADEBOOK_SUBJECTS.map((s) => [s, r.subject_scores[s] ?? 0])),
        test: r.test_score,
        total: r.total_score,
        grade: r.grade,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented
          value={term}
          onChange={(v) => router.push(`/exams?term=${encodeURIComponent(v)}`)}
          options={TERMS.map((t) => ({ value: t, label: t }))}
        />
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
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={15} /> Add Exam
        </Button>
      </div>

      <ExamsTable
        rows={filtered}
        onEdit={(r) => {
          setEditing(r);
          setModalOpen(true);
        }}
        onDelete={onDelete}
      />

      <ExamModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        exam={editing}
        term={term}
        eligibleStudents={eligibleStudents}
      />
    </div>
  );
}
