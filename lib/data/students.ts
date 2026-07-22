import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/data/photos";
import { STUDENTS_PAGE_SIZE } from "@/lib/pagination";
import type { Student, PersonStatus } from "@/lib/types/database";

type StudentJoinRow = Student & { classes: { name: string } | null };

export type StudentWithClass = {
  id: string;
  seq: number;
  full_name: string;
  dob: string | null;
  gender: "male" | "female" | null;
  address: string | null;
  mobile: string | null;
  parent_mobile: string | null;
  base_fees: number;
  photo_url: string | null;
  status: PersonStatus;
  class_id: string | null;
  class_name: string | null;
  today_status: "present" | "late" | "absent" | null;
};

export type StudentsPage = { rows: StudentWithClass[]; hasMore: boolean };

// One page of students, searched and ordered in the database so the
// result set stays small no matter how many students the school has.
// Text search matches the name; a numeric query matches the student
// number (STU-1000+seq, or the raw seq).
export async function listStudents(
  opts: { search?: string; offset?: number; limit?: number } = {}
): Promise<StudentsPage> {
  const supabase = await createClient();
  const limit = opts.limit ?? STUDENTS_PAGE_SIZE;
  const offset = opts.offset ?? 0;
  const search = (opts.search ?? "").trim();

  let query = supabase
    .from("students")
    .select("*, classes(name)")
    .order("seq", { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) {
    const digits = search.replace(/[^0-9]/g, "");
    if (digits && /^\s*(stu[-\s]?)?\d+\s*$/i.test(search)) {
      const n = Number(digits);
      query = query.eq("seq", n >= 1000 ? n - 1000 : n);
    } else {
      query = query.ilike("full_name", `%${search}%`);
    }
  }

  const { data: students } = await query.returns<StudentJoinRow[]>();
  const rows = students ?? [];
  const hasMore = rows.length === limit;

  // Today's attendance, only for the students on this page.
  const today = new Date().toISOString().slice(0, 10);
  const ids = rows.map((s) => s.id);
  const attendanceMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("date", today)
      .in("student_id", ids);
    for (const a of attendance ?? []) attendanceMap.set(a.student_id, a.status);
  }

  const mapped = rows.map((s) => ({
    id: s.id,
    seq: s.seq,
    full_name: s.full_name,
    dob: s.dob,
    gender: s.gender,
    address: s.address,
    mobile: s.mobile,
    parent_mobile: s.parent_mobile,
    base_fees: Number(s.base_fees),
    photo_url: s.photo_url,
    status: s.status,
    class_id: s.class_id,
    class_name: s.classes?.name ?? null,
    today_status: (attendanceMap.get(s.id) as "present" | "late" | "absent" | undefined) ?? null,
  }));

  return { rows: await signPhotoUrls(mapped), hasMore };
}

export async function listClassOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name, base_fees").order("name");
  return (data ?? []).map((c) => ({ ...c, base_fees: Number(c.base_fees) }));
}
