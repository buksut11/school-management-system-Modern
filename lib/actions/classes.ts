"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/students";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function saveClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return { error: "Class name is required." };

  const supabase = await createClient();
  const record = {
    name,
    room: str(formData, "room"),
    base_fees: Number(str(formData, "base_fees") ?? 0),
    capacity: Number(str(formData, "capacity") ?? 40),
    teacher_id: str(formData, "teacher_id"),
  };

  if (id) {
    const { error } = await supabase.from("classes").update(record).eq("id", id);
    if (error) return { error: error.message };
    await supabase.from("activity_log").insert({ kind: "class", message: `Updated class · ${name}` });
  } else {
    const { error } = await supabase.from("classes").insert(record);
    if (error) return { error: error.message };
    await supabase.from("activity_log").insert({ kind: "class", message: `New class created · ${name}` });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteClass(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("activity_log").insert({ kind: "class", message: `Removed class · ${name}` });
  revalidatePath("/", "layout");
}
