"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { logActivity } from "@/lib/activity";
import { normalizePhotoPath } from "@/lib/utils";
import { removeReplacedPhoto } from "@/lib/photo-cleanup";
import { listStudents, type StudentsPage } from "@/lib/data/students";
import type { Gender, PersonStatus } from "@/lib/types/database";

export type FormState = { error?: string; success?: boolean } | undefined;

// Client-callable pagination/search for the students list.
export async function searchStudents(opts: {
  search: string;
  offset: number;
  limit?: number;
}): Promise<StudentsPage> {
  return listStudents(opts);
}

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
    // Forms hold display (signed) URLs; only the bare storage path is
    // persisted — see normalizePhotoPath.
    photo_url: normalizePhotoPath(str(formData, "photo_url")),
    status: (str(formData, "status") ?? "active") as PersonStatus,
  };

  if (id) {
    const { data: existing } = await supabase
      .from("students")
      .select("photo_url")
      .eq("id", id)
      .single();
    const { error } = await supabase.from("students").update(record).eq("id", id);
    if (error) return { error: friendlyError(error) };
    await removeReplacedPhoto(supabase, existing?.photo_url, record.photo_url);
    await logActivity(supabase, "student", `Updated student · ${fullName}`);
  } else {
    const { error } = await supabase.from("students").insert(record);
    if (error) return { error: friendlyError(error) };
    await logActivity(supabase, "student", `New student enrolled · ${fullName}`);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteStudent(id: string, fullName: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("students")
    .select("photo_url")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    // 23503 = foreign key violation. Since migration 0013 payment history
    // is protected (on delete restrict), so a student who has paid fees
    // can't be hard-deleted — their financial records must survive.
    if (error.code === "23503") {
      return {
        error: `${fullName} has fee payment history, which must be kept. Set their status to inactive instead.`,
      };
    }
    return { error: friendlyError(error) };
  }
  await removeReplacedPhoto(supabase, existing?.photo_url, null);
  await logActivity(supabase, "student", `Removed student · ${fullName}`);
  revalidatePath("/", "layout");
  return { success: true };
}
