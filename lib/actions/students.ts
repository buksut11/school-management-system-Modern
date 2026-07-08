"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { Gender, PersonStatus } from "@/lib/types/database";

export type FormState = { error?: string; success?: boolean } | undefined;

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function saveStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const fullName = str(formData, "full_name");
  if (!fullName) return { error: "Student name is required." };

  const supabase = await createClient();
  const record = {
    full_name: fullName,
    dob: str(formData, "dob"),
    gender: str(formData, "gender") as Gender | null,
    address: str(formData, "address"),
    mobile: str(formData, "mobile"),
    parent_mobile: str(formData, "parent_mobile"),
    class_id: str(formData, "class_id"),
    base_fees: Number(str(formData, "base_fees") ?? 0),
    photo_url: str(formData, "photo_url"),
    status: (str(formData, "status") ?? "active") as PersonStatus,
  };

  if (id) {
    const { error } = await supabase.from("students").update(record).eq("id", id);
    if (error) return { error: error.message };
    await logActivity(supabase, "student", `Updated student · ${fullName}`);
  } else {
    const { error } = await supabase.from("students").insert(record);
    if (error) return { error: error.message };
    await logActivity(supabase, "student", `New student enrolled · ${fullName}`);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteStudent(id: string, fullName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, "student", `Removed student · ${fullName}`);
  revalidatePath("/", "layout");
}
