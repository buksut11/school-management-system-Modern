"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Download } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ExamsTable } from "./exams-table";
import { ExamModal } from "./exam-modal";
import { deleteExam } from "@/lib/actions/exams";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { TERMS } from "@/lib/constants";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ExamRow, GradebookSubject } from "@/lib/data/exams";
import type { AcademicYear, Term } from "@/lib/types/database";

const TERM_KEY: Record<Term, MessageKey> = {
  "Term 1": "col.term1",
  "Term 2": "col.term2",
  "Term 3": "col.term3",
};

export function ExamsView({
  term,
  year,
  years,
  rows,
  subjects,
  classes,
  eligibleStudents,
}: {
  term: Term;
  year: AcademicYear | null;
  years: AcademicYear[];
  rows: ExamRow[];
  subjects: GradebookSubject[];
  classes: { id: string; name: string }[];
  eligibleStudents: { id: string; full_name: string; class_id: string | null; class_name: string | null }[];
}) {
  const router = useRouter();
  const t = useT();
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
    const ok = await confirm({
      title: t("exam.removeTitle", { name: r.student_name, term: t(TERM_KEY[term]) }),
      confirmLabel: t("common.remove"),
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteExam(r.id, r.student_name);
      show(t("exam.removed"));
    });
  }

  function exportCsv() {
    downloadCsv(
      `exams-${term.replace(" ", "-").toLowerCase()}.csv`,
      filtered.map((r) => ({
        student: r.student_name,
        class: r.class_name ?? "",
        ...Object.fromEntries(subjects.map((s) => [s.name, r.subject_scores[s.name] ?? 0])),
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
          onChange={(v) =>
            router.push(`/exams?term=${encodeURIComponent(v)}${year ? `&year=${year.id}` : ""}`)
          }
          options={TERMS.map((tm) => ({ value: tm, label: t(TERM_KEY[tm]) }))}
        />
        {years.length > 1 && (
          <Select
            value={year?.id ?? ""}
            onChange={(e) => router.push(`/exams?term=${encodeURIComponent(term)}&year=${e.target.value}`)}
            className="w-auto"
            aria-label={t("field.academicYear")}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.is_current ? ` (${t("common.current")})` : ""}
              </option>
            ))}
          </Select>
        )}
        <Segmented
          value={classFilter}
          onChange={setClassFilter}
          options={[{ value: "all", label: t("common.all") }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("ar.searchStudents")}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" size="md" onClick={exportCsv}>
          <Download size={15} /> {t("common.export")}
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={15} /> {t("exam.add")}
        </Button>
      </div>

      <ExamsTable
        rows={filtered}
        subjects={subjects.map((s) => s.name)}
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
        yearId={year?.id ?? null}
        subjects={subjects}
        eligibleStudents={eligibleStudents}
      />
    </div>
  );
}
