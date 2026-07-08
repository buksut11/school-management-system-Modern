"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
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
  const teacherId = str(formData, "teacher_id");
  const record = {
    name,
    room: str(formData, "room"),
    base_fees: Number(str(formData, "base_fees") ?? 0),
    capacity: Number(str(formData, "capacity") ?? 40),
    teacher_id: teacherId,
  };

  // A teacher can lead at most one class — if this teacher was already
  // assigned elsewhere, detach them from that class first so the
  // relationship never points two ways at once.
  if (teacherId) {
    await supabase.from("classes").update({ teacher_id: null }).eq("teacher_id", teacherId).neq("id", id ?? "");
  }

  if (id) {
    const { error } = await supabase.from("classes").update(record).eq("id", id);
    if (error) return { error: error.message };
    await logActivity(supabase, "class", `Updated class · ${name}`);
  } else {
    const { error } = await supabase.from("classes").insert(record);
    if (error) return { error: error.message };
    await logActivity(supabase, "class", `New class created · ${name}`);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteClass(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, "class", `Removed class · ${name}`);
  revalidatePath("/", "layout");
}
