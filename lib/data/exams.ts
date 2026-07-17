import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/data/photos";
import { gradeForTotal } from "@/lib/grades";
import type { Term } from "@/lib/types/database";

export type GradebookSubject = { id: string; name: string };

// The gradebook's columns are the school's OWN subjects (migration
// 0035), not a hard-coded list.
export async function listGradebookSubjects(): Promise<GradebookSubject[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("id, name").order("seq");
  return data ?? [];
}

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
  // Display scores keyed by subject NAME. Relational rows (exam_scores,
  // resolved to each subject's current name) win; the name-keyed
  // snapshot fills in for pre-0035 records.
  subject_scores: Record<string, number>;
  // The same scores keyed by subject id — what the edit form posts back.
  scores_by_id: Record<string, number>;
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
  exam_scores: { subject_id: string; score: number }[];
};

export async function listExams(term: Term, yearId: string | null): Promise<ExamRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("exams")
    .select("*, students(full_name, photo_url), classes(name), exam_scores(subject_id, score)")
    .eq("term", term);
  if (yearId) query = query.eq("year_id", yearId);
  const [{ data }, subjects] = await Promise.all([
    query.returns<RawExam[]>(),
    listGradebookSubjects(),
  ]);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

  return signPhotoUrls((data ?? [])
    .map((e) => {
      const byName: Record<string, number> = { ...(e.subject_scores ?? {}) };
      const byId: Record<string, number> = {};
      for (const s of e.exam_scores ?? []) {
        byId[s.subject_id] = Number(s.score);
        const name = subjectName.get(s.subject_id);
        if (name) byName[name] = Number(s.score);
      }
      return {
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
        subject_scores: byName,
        scores_by_id: byId,
        total_score: Number(e.total_score),
        grade: e.grade,
      };
    })
    .sort((a, b) => a.student_name.localeCompare(b.student_name)));
}

export async function listEligibleStudentsForExam(term: Term, yearId: string | null) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let existingQuery = supabase.from("exams").select("student_id").eq("term", term);
  if (yearId) existingQuery = existingQuery.eq("year_id", yearId);

  const [{ data: students }, { data: attendance }, { data: existing }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, class_id, classes(name)")
      .eq("status", "active")
      .returns<Array<{ id: string; full_name: string; class_id: string | null; classes: { name: string } | null }>>(),
    supabase.from("attendance").select("student_id, status").eq("date", today),
    existingQuery,
  ]);

  const absentIds = new Set((attendance ?? []).filter((a) => a.status === "absent").map((a) => a.student_id));
  const existingIds = new Set((existing ?? []).map((e) => e.student_id));

  return (students ?? [])
    .filter((s) => !absentIds.has(s.id) && !existingIds.has(s.id))
    .map((s) => ({ id: s.id, full_name: s.full_name, class_id: s.class_id, class_name: s.classes?.name ?? null }));
}

export async function listAcademicRecords(yearId: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("exams")
    .select("student_id, term, total_score, grade, students(full_name, class_id, classes(name))");
  if (yearId) query = query.eq("year_id", yearId);
  // The average's letter grade depends on how many subjects make up a
  // full gradebook — that's the school's subject count now, not a
  // hard-coded seven.
  const { count: subjectCount } = await supabase
    .from("subjects")
    .select("id", { count: "exact", head: true });
  const { data } = await query.returns<
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
      grade: gradeForTotal(average, subjectCount ?? 0),
      trend,
    };
  });
}
