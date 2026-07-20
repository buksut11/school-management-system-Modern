import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/data/photos";
import type { Teacher } from "@/lib/types/database";

type TeacherJoinRow = Teacher & {
  classes: { id: string; name: string }[];
  teacher_subjects: { subject_id: string }[];
};

export type TeacherWithClass = {
  id: string;
  seq: number;
  full_name: string;
  dob: string | null;
  gender: "male" | "female" | null;
  address: string | null;
  mobile: string | null;
  // Display names (the trigger-maintained snapshot) for the directory,
  // plus the subject ids the edit form preselects.
  subjects: string[];
  subject_ids: string[];
  photo_url: string | null;
  status: "active" | "inactive";
  class_id: string | null;
  class_name: string | null;
};

export async function listTeachers(): Promise<TeacherWithClass[]> {
  const supabase = await createClient();
  // "classes" is embedded in reverse here — classes.teacher_id -> teachers.id
  // is the only FK between the two tables now, so a teacher can show the
  // one class (if any) that names them as its class teacher.
  const { data } = await supabase
    .from("teachers")
    .select("*, classes(id, name), teacher_subjects(subject_id)")
    .order("seq", { ascending: true })
    .returns<TeacherJoinRow[]>();

  return signPhotoUrls((data ?? []).map((t) => {
    const assignedClass = t.classes?.[0] ?? null;
    return {
      id: t.id,
      seq: t.seq,
      full_name: t.full_name,
      dob: t.dob,
      gender: t.gender,
      address: t.address,
      mobile: t.mobile,
      subjects: t.subjects ?? [],
      subject_ids: (t.teacher_subjects ?? []).map((ts) => ts.subject_id),
      photo_url: t.photo_url,
      status: t.status,
      class_id: assignedClass?.id ?? null,
      class_name: assignedClass?.name ?? null,
    };
  }));
}

export async function listTeacherOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}
