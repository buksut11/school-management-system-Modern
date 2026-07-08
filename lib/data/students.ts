import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types/database";

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
  status: "active" | "inactive";
  class_id: string | null;
  class_name: string | null;
  today_status: "present" | "late" | "absent" | null;
};

export async function listStudents(): Promise<StudentWithClass[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: attendance }] = await Promise.all([
    supabase
      .from("students")
      .select("*, classes(name)")
      .order("seq", { ascending: true })
      .returns<StudentJoinRow[]>(),
    supabase.from("attendance").select("student_id, status").eq("date", today),
  ]);

  const attendanceMap = new Map((attendance ?? []).map((a) => [a.student_id, a.status]));

  return (students ?? []).map((s) => ({
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
}

export async function listClassOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("id, name").order("name");
  return data ?? [];
}
