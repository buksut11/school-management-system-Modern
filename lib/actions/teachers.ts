"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import { normalizePhotoPath } from "@/lib/utils";
import { removeReplacedPhoto } from "@/lib/photo-cleanup";
import { listTeachers, type TeachersPage } from "@/lib/data/teachers";
import type { FormState } from "@/lib/actions/students";
import type { Gender, PersonStatus } from "@/lib/types/database";

// Client-callable pagination/search for the teachers list.
export async function searchTeachers(opts: {
  search: string;
  offset: number;
  limit?: number;
}): Promise<TeachersPage> {
  return listTeachers(opts);
}

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
  if (!fullName) return { error: (await getT())("err.teacherNameRequired") };

  const supabase = await createClient();
  const classId = str(formData, "class_id");
  // Subjects are chosen from the school's subject list now (migration
  // 0036) — the form posts one subject_ids value per checked subject.
  // teachers.subjects stays as a snapshot the database maintains from
  // these links, so it's never set here.
  const subjectIds = formData
    .getAll("subject_ids")
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");

  const record = {
    full_name: fullName,
    dob: str(formData, "dob"),
    gender: str(formData, "gender") as Gender | null,
    address: str(formData, "address"),
    mobile: str(formData, "mobile"),
    photo_url: normalizePhotoPath(str(formData, "photo_url")),
    status: (str(formData, "status") ?? "active") as PersonStatus,
  };

  let teacherId = id;
  if (id) {
    const { data: existing } = await supabase
      .from("teachers")
      .select("photo_url")
      .eq("id", id)
      .single();
    const { error } = await supabase.from("teachers").update(record).eq("id", id);
    if (error) return { error: friendlyError(error) };
    await removeReplacedPhoto(supabase, existing?.photo_url, record.photo_url);
    await assignTeacherClass(supabase, id, classId);
    await logActivity(supabase, "teacher", `Updated teacher · ${fullName}`);
  } else {
    const { data: inserted, error } = await supabase.from("teachers").insert(record).select("id").single();
    if (error) return { error: friendlyError(error) };
    teacherId = inserted.id;
    await assignTeacherClass(supabase, inserted.id, classId);
    await logActivity(supabase, "teacher", `New teacher added · ${fullName}`);
  }

  if (teacherId) {
    // Replaces the teacher's subject links atomically and refreshes the
    // teachers.subjects snapshot via trigger.
    const { error } = await supabase.rpc("set_teacher_subjects", {
      p_teacher_id: teacherId,
      p_subject_ids: subjectIds,
    });
    if (error) return { error: friendlyError(error) };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteTeacher(id: string, fullName: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("teachers")
    .select("photo_url")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("teachers").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
  await removeReplacedPhoto(supabase, existing?.photo_url, null);
  await logActivity(supabase, "teacher", `Removed teacher · ${fullName}`);
  revalidatePath("/", "layout");
}
