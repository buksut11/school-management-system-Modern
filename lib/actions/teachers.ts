"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/students";
import type { Gender, PersonStatus } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function saveTeacher(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const fullName = str(formData, "full_name");
  if (!fullName) return { error: "Teacher name is required." };

  const supabase = await createClient();
  const subjects = (str(formData, "subjects") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const record = {
    full_name: fullName,
    dob: str(formData, "dob"),
    gender: str(formData, "gender") as Gender | null,
    address: str(formData, "address"),
    mobile: str(formData, "mobile"),
    subjects,
    class_id: str(formData, "class_id"),
    photo_url: str(formData, "photo_url"),
    status: (str(formData, "status") ?? "active") as PersonStatus,
  };

  if (id) {
    const { error } = await supabase.from("teachers").update(record).eq("id", id);
    if (error) return { error: error.message };
    await supabase.from("activity_log").insert({
      kind: "teacher",
      message: `Updated teacher · ${fullName}`,
    });
  } else {
    const { error } = await supabase.from("teachers").insert(record);
    if (error) return { error: error.message };
    await supabase.from("activity_log").insert({
      kind: "teacher",
      message: `New teacher added · ${fullName}`,
    });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteTeacher(id: string, fullName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("activity_log").insert({
    kind: "teacher",
    message: `Removed teacher · ${fullName}`,
  });
  revalidatePath("/", "layout");
}
