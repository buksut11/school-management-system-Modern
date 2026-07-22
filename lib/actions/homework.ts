"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function saveHomework(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const classId = str(formData, "class_id");
  const title = str(formData, "title");
  const t = await getT();
  if (!classId) return { error: t("err.chooseClass") };
  if (!title) return { error: t("err.titleRequired") };

  const supabase = await createClient();
  const record = {
    class_id: classId,
    subject_id: str(formData, "subject_id"),
    title,
    details: str(formData, "details"),
    due_date: str(formData, "due_date"),
  };

  if (id) {
    const { error } = await supabase.from("homework").update(record).eq("id", id);
    if (error) return { error: friendlyError(error) };
    await logActivity(supabase, "homework", `Updated homework · ${title}`);
  } else {
    const { error } = await supabase.from("homework").insert(record);
    if (error) return { error: friendlyError(error) };
    await logActivity(supabase, "homework", `Homework set · ${title}`);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteHomework(id: string, title: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.from("homework").delete().eq("id", id);
  if (error) return { error: friendlyError(error) };
  await logActivity(supabase, "homework", `Removed homework · ${title}`);
  revalidatePath("/", "layout");
  return { success: true };
}

// Tick / untick an assignment for one student (the learner's own, or a
// staff member on their behalf — enforced by RLS).
export async function toggleHomeworkDone(
  homeworkId: string,
  studentId: string,
  done: boolean
): Promise<FormState> {
  const supabase = await createClient();
  if (done) {
    const { error } = await supabase
      .from("homework_completions")
      .upsert({ homework_id: homeworkId, student_id: studentId }, { onConflict: "homework_id,student_id" });
    if (error) return { error: friendlyError(error) };
  } else {
    const { error } = await supabase
      .from("homework_completions")
      .delete()
      .eq("homework_id", homeworkId)
      .eq("student_id", studentId);
    if (error) return { error: friendlyError(error) };
  }
  revalidatePath("/", "layout");
  return { success: true };
}
