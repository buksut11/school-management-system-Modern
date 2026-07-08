import { createClient } from "@/lib/supabase/server";
import { GRADEBOOK_SUBJECTS } from "@/lib/constants";
import type { Term } from "@/lib/types/database";

export type ExamRow = {
  id: string;
  student_id: string;
  student_name: string;
  photo_url: string | null;
  class_id: string | null;
  class_name: string | null;
  term: Term;
  exam_date: string;
  attendance_pct: number;
  test_score: number;
  subject_scores: Record<string, number>;
  total_score: number;
  grade: string;
};

type RawExam = {
  id: string;
  student_id: string;
  class_id: string | null;
  term: Term;
  exam_date: string;
  attendance_pct: number;
  test_score: number;
  subject_scores: Record<string, number>;
  total_score: number;
  grade: string;
  students: { full_name: string; photo_url: string | null } | null;
  classes: { name: string } | null;
};

export async function listExams(term: Term): Promise<ExamRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("*, students(full_name, photo_url), classes(name)")
    .eq("term", term)
    .returns<RawExam[]>();

  return (data ?? [])
    .map((e) => ({
      id: e.id,
      student_id: e.student_id,
      student_name: e.students?.full_name ?? "Unknown",
      photo_url: e.students?.photo_url ?? null,
      class_id: e.class_id,
      class_name: e.classes?.name ?? null,
      term: e.term,
      exam_date: e.exam_date,
      attendance_pct: Number(e.attendance_pct),
      test_score: Number(e.test_score),
      subject_scores: e.subject_scores ?? {},
      total_score: Number(e.total_score),
      grade: e.grade,
    }))
    .sort((a, b) => a.student_name.localeCompare(b.student_name));
}

export async function listEligibleStudentsForExam(term: Term) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: attendance }, { data: existing }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, class_id, classes(name)")
      .eq("status", "active")
      .returns<Array<{ id: string; full_name: string; class_id: string | null; classes: { name: string } | null }>>(),
    supabase.from("attendance").select("student_id, status").eq("date", today),
    supabase.from("exams").select("student_id").eq("term", term),
  ]);

  const absentIds = new Set((attendance ?? []).filter((a) => a.status === "absent").map((a) => a.student_id));
  const existingIds = new Set((existing ?? []).map((e) => e.student_id));

  return (students ?? [])
    .filter((s) => !absentIds.has(s.id) && !existingIds.has(s.id))
    .map((s) => ({ id: s.id, full_name: s.full_name, class_id: s.class_id, class_name: s.classes?.name ?? null }));
}

export async function listAcademicRecords() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("student_id, term, total_score, grade, students(full_name, class_id, classes(name))")
    .returns<
      Array<{
        student_id: string;
        term: Term;
        total_score: number;
        grade: string;
        students: { full_name: string; class_id: string | null; classes: { name: string } | null } | null;
      }>
    >();

  const byStudent = new Map<
    string,
    { student_name: string; class_id: string | null; class_name: string | null; terms: Partial<Record<Term, number>> }
  >();

  for (const row of data ?? []) {
    const key = row.student_id;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        student_name: row.students?.full_name ?? "Unknown",
        class_id: row.students?.class_id ?? null,
        class_name: row.students?.classes?.name ?? null,
        terms: {},
      });
    }
    byStudent.get(key)!.terms[row.term] = Number(row.total_score);
  }

  return Array.from(byStudent.entries()).map(([studentId, v]) => {
    const scores = Object.values(v.terms).filter((n): n is number => typeof n === "number");
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const ordered = (["Term 1", "Term 2", "Term 3"] as Term[])
      .map((t) => v.terms[t])
      .filter((n): n is number => typeof n === "number");
    const trend: "up" | "down" | "flat" =
      ordered.length < 2
        ? "flat"
        : ordered[ordered.length - 1] > ordered[ordered.length - 2]
          ? "up"
          : ordered[ordered.length - 1] < ordered[ordered.length - 2]
            ? "down"
            : "flat";
    return {
      student_id: studentId,
      student_name: v.student_name,
      class_id: v.class_id,
      class_name: v.class_name,
      term1: v.terms["Term 1"] ?? null,
      term2: v.terms["Term 2"] ?? null,
      term3: v.terms["Term 3"] ?? null,
      average: Math.round(average * 10) / 10,
      grade: computeGradeLabel(average),
      trend,
    };
  });
}

function computeGradeLabel(average: number) {
  const max = GRADEBOOK_SUBJECTS.length * 100 + 100;
  const pct = (average / max) * 100;
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}
