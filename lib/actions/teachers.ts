"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";
import type { Gender, PersonStatus } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// classes.teacher_id is the only stored copy of "which teacher runs this
// class" — teachers has no class_id column. Assigning a class to a teacher
// here means: point that class's teacher_id at this teacher, and clear
// teacher_id on any other class that used to point at them (a teacher
// can lead at most one class).
async function assignTeacherClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  classId: string | null
) {
  await supabase.from("classes").update({ teacher_id: null }).eq("teacher_id", teacherId);
  if (classId) {
    await supabase.from("classes").update({ teacher_id: teacherId }).eq("id", classId);
  }
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
  const classId = str(formData, "class_id");

  const record = {
    full_name: fullName,
    dob: str(formData, "dob"),
    gender: str(formData, "gender") as Gender | null,
    address: str(formData, "address"),
    mobile: str(formData, "mobile"),
    subjects,
    photo_url: str(formData, "photo_url"),
    status: (str(formData, "status") ?? "active") as PersonStatus,
  };

  if (id) {
    const { error } = await supabase.from("teachers").update(record).eq("id", id);
    if (error) return { error: error.message };
    await assignTeacherClass(supabase, id, classId);
    await logActivity(supabase, "teacher", `Updated teacher · ${fullName}`);
  } else {
    const { data: inserted, error } = await supabase.from("teachers").insert(record).select("id").single();
    if (error) return { error: error.message };
    await assignTeacherClass(supabase, inserted.id, classId);
    await logActivity(supabase, "teacher", `New teacher added · ${fullName}`);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteTeacher(id: string, fullName: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, "teacher", `Removed teacher · ${fullName}`);
  revalidatePath("/", "layout");
}
