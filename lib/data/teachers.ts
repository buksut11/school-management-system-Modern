import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/data/photos";
import { TEACHERS_PAGE_SIZE } from "@/lib/pagination";
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

export type TeachersPage = { rows: TeacherWithClass[]; hasMore: boolean };

// One page of teachers, searched/ordered in the database. Text search
// matches the name; a numeric query matches the teacher number
// (TCH-100+seq, or the raw seq).
export async function listTeachers(
  opts: { search?: string; offset?: number; limit?: number } = {}
): Promise<TeachersPage> {
  const supabase = await createClient();
  const limit = opts.limit ?? TEACHERS_PAGE_SIZE;
  const offset = opts.offset ?? 0;
  const search = (opts.search ?? "").trim();

  // "classes" is embedded in reverse here — classes.teacher_id -> teachers.id
  // is the only FK between the two tables now, so a teacher can show the
  // one class (if any) that names them as its class teacher.
  let query = supabase
    .from("teachers")
    .select("*, classes(id, name), teacher_subjects(subject_id)")
    .order("seq", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const digits = search.replace(/[^0-9]/g, "");
    if (digits && /^\s*(tch[-\s]?)?\d+\s*$/i.test(search)) {
      const n = Number(digits);
      query = query.eq("seq", n >= 100 ? n - 100 : n);
    } else {
      query = query.ilike("full_name", `%${search}%`);
    }
  }

  const { data } = await query.returns<TeacherJoinRow[]>();
  const rows = data ?? [];
  const hasMore = rows.length === limit;

  const mapped = rows.map((t) => {
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
  });

  return { rows: await signPhotoUrls(mapped), hasMore };
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
