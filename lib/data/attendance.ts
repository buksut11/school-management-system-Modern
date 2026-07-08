import { createClient } from "@/lib/supabase/server";

type StudentRosterRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  class_id: string | null;
  classes: { name: string } | null;
};

export type AttendanceRow = {
  student_id: string;
  full_name: string;
  photo_url: string | null;
  class_id: string | null;
  class_name: string | null;
  status: "present" | "late" | "absent";
};

export async function listAttendance(date: string): Promise<AttendanceRow[]> {
  const supabase = await createClient();

  const [{ data: students }, { data: attendance }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, photo_url, class_id, classes(name)")
      .eq("status", "active")
      .order("seq", { ascending: true })
      .returns<StudentRosterRow[]>(),
    supabase.from("attendance").select("student_id, status").eq("date", date),
  ]);

  const statusMap = new Map((attendance ?? []).map((a) => [a.student_id, a.status]));

  return (students ?? []).map((s) => ({
    student_id: s.id,
    full_name: s.full_name,
    photo_url: s.photo_url,
    class_id: s.class_id,
    class_name: s.classes?.name ?? null,
    status: (statusMap.get(s.id) as "present" | "late" | "absent" | undefined) ?? "present",
  }));
}
