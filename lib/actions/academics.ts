"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/students";
import type { SubjectType } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function saveDepartment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return { error: "Department name is required." };

  const supabase = await createClient();
  const record = { name, head_teacher_id: str(formData, "head_teacher_id") };

  const query = id
    ? supabase.from("departments").update(record).eq("id", id)
    : supabase.from("departments").insert(record);
  const { error } = await query;
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    kind: "department",
    message: `${id ? "Updated" : "New"} department · ${name}`,
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteDepartment(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("activity_log").insert({ kind: "department", message: `Removed department · ${name}` });
  revalidatePath("/", "layout");
}

export async function saveSubject(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return { error: "Subject name is required." };

  const supabase = await createClient();
  const record = {
    name,
    department_id: str(formData, "department_id"),
    teacher_id: str(formData, "teacher_id"),
    type: (str(formData, "type") ?? "core") as SubjectType,
    periods_per_week: Number(str(formData, "periods_per_week") ?? 0),
    description: str(formData, "description"),
  };

  const query = id
    ? supabase.from("subjects").update(record).eq("id", id)
    : supabase.from("subjects").insert(record);
  const { error } = await query;
  if (error) return { error: error.message };

  await supabase.from("activity_log").insert({
    kind: "subject",
    message: `${id ? "Updated" : "New"} subject · ${name}`,
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteSubject(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("activity_log").insert({ kind: "subject", message: `Removed subject · ${name}` });
  revalidatePath("/", "layout");
}
