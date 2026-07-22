import { createClient } from "@/lib/supabase/server";
import type { Homework } from "@/lib/types/database";

type HomeworkJoin = Homework & {
  classes: { name: string } | null;
  subjects: { name: string } | null;
};

// ---- Staff / teacher view: manage the board, see completion counts ----
export type HomeworkRow = {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string | null;
  subject_name: string | null;
  title: string;
  details: string | null;
  due_date: string | null;
  created_at: string;
  done_count: number;
  total_count: number;
};

export async function listHomeworkForStaff(): Promise<HomeworkRow[]> {
  const supabase = await createClient();

  const [{ data: hw }, { data: completions }, { data: students }] = await Promise.all([
    supabase
      .from("homework")
      .select("*, classes(name), subjects(name)")
      .order("created_at", { ascending: false })
      .returns<HomeworkJoin[]>(),
    supabase.from("homework_completions").select("homework_id"),
    supabase.from("students").select("class_id").eq("status", "active"),
  ]);

  const doneByHw = new Map<string, number>();
  for (const c of completions ?? []) doneByHw.set(c.homework_id, (doneByHw.get(c.homework_id) ?? 0) + 1);

  const totalByClass = new Map<string, number>();
  for (const s of students ?? []) {
    if (s.class_id) totalByClass.set(s.class_id, (totalByClass.get(s.class_id) ?? 0) + 1);
  }

  return (hw ?? []).map((h) => ({
    id: h.id,
    class_id: h.class_id,
    class_name: h.classes?.name ?? "—",
    subject_id: h.subject_id,
    subject_name: h.subjects?.name ?? null,
    title: h.title,
    details: h.details,
    due_date: h.due_date,
    created_at: h.created_at,
    done_count: doneByHw.get(h.id) ?? 0,
    total_count: totalByClass.get(h.class_id) ?? 0,
  }));
}

// ---- Student / parent view: their class's board, tick per student ----
export type FamilyHomeworkRow = {
  id: string;
  class_name: string;
  subject_name: string | null;
  title: string;
  details: string | null;
  due_date: string | null;
  students: { id: string; full_name: string; done: boolean }[];
};

export async function listHomeworkForFamily(): Promise<FamilyHomeworkRow[]> {
  const supabase = await createClient();

  // RLS limits each of these to the viewer's own linked students and
  // their class's board.
  const [{ data: myStudents }, { data: hw }, { data: completions }] = await Promise.all([
    supabase.from("students").select("id, full_name, class_id"),
    supabase
      .from("homework")
      .select("*, classes(name), subjects(name)")
      .order("created_at", { ascending: false })
      .returns<HomeworkJoin[]>(),
    supabase.from("homework_completions").select("homework_id, student_id"),
  ]);

  const done = new Set((completions ?? []).map((c) => `${c.homework_id}:${c.student_id}`));

  return (hw ?? []).map((h) => ({
    id: h.id,
    class_name: h.classes?.name ?? "—",
    subject_name: h.subjects?.name ?? null,
    title: h.title,
    details: h.details,
    due_date: h.due_date,
    students: (myStudents ?? [])
      .filter((s) => s.class_id === h.class_id)
      .map((s) => ({ id: s.id, full_name: s.full_name, done: done.has(`${h.id}:${s.id}`) })),
  }));
}
