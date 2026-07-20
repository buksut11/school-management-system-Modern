"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
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

  // One score input per subject the school teaches, named by subject id
  // (the gradebook is the subjects table since migration 0035).
  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("subject_") && typeof value === "string") {
      scores[key.slice("subject_".length)] = Number(value.trim() || 0);
    }
  }

  const supabase = await createClient();
  // The exam row and its per-subject scores are written in one database
  // transaction; total_score and the grade are computed there too, so a
  // crafted request can't store a fabricated grade.
  const { data, error } = await supabase.rpc("save_exam", {
    p_student_id: studentId,
    p_term: (str(formData, "term") ?? "Term 1") as Term,
    p_scores: scores,
    p_exam_id: id,
    p_class_id: str(formData, "class_id"),
    p_year_id: str(formData, "year_id"),
    p_exam_date: str(formData, "exam_date"),
    p_attendance_pct: num(formData, "attendance_pct"),
    p_test_score: num(formData, "test_score"),
  });
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    "exam",
    `${id ? "Updated" : "Recorded"} exam · ${data?.student_name ?? "Student"} · ${str(formData, "term") ?? "Term 1"}`
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
