"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { GRADEBOOK_SUBJECTS } from "@/lib/constants";
import { computeTotal, computeGrade } from "@/lib/grades";
import type { FormState } from "@/lib/actions/students";
import type { Term } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(formData: FormData, key: string) {
  return Number(str(formData, key) ?? 0);
}

export async function saveExam(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const studentId = str(formData, "student_id");
  if (!studentId) return { error: "Select a student." };

  const subjectScores: Record<string, number> = {};
  for (const subject of GRADEBOOK_SUBJECTS) {
    subjectScores[subject] = num(formData, `subject_${subject}`);
  }
  const testScore = num(formData, "test_score");
  const totalScore = computeTotal(subjectScores, testScore);
  const grade = computeGrade(totalScore);

  const supabase = await createClient();
  const record = {
    student_id: studentId,
    class_id: str(formData, "class_id"),
    term: (str(formData, "term") ?? "Term 1") as Term,
    exam_date: str(formData, "exam_date") ?? new Date().toISOString().slice(0, 10),
    attendance_pct: num(formData, "attendance_pct"),
    test_score: testScore,
    subject_scores: subjectScores,
    total_score: totalScore,
    grade,
  };

  const { data: student } = await supabase.from("students").select("full_name").eq("id", studentId).single();

  const query = id ? supabase.from("exams").update(record).eq("id", id) : supabase.from("exams").insert(record);
  const { error } = await query;
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    "exam",
    `${id ? "Updated" : "Recorded"} exam · ${student?.full_name ?? "Student"} · ${record.term}`
  );
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteExam(id: string, studentName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, "exam", `Removed exam record · ${studentName}`);
  revalidatePath("/", "layout");
}
