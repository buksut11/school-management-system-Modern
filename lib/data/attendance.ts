import { createClient } from "@/lib/supabase/server";

type StudentRosterRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  class_id: string | null;
  classes: { name: string } | null;
};

type AttendanceRecordRow = {
  student_id: string;
  status: "present" | "late" | "absent";
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
    supabase
      .from("attendance")
      .select("student_id, status, class_id, classes(name)")
      .eq("date", date)
      .returns<AttendanceRecordRow[]>(),
  ]);

  const recordMap = new Map((attendance ?? []).map((a) => [a.student_id, a]));

  return (students ?? []).map((s) => {
    // Prefer the class snapshotted on the attendance record itself (correct
    // even if the student has since moved classes); fall back to their
    // current class for days that were never explicitly marked.
    const record = recordMap.get(s.id);
    return {
      student_id: s.id,
      full_name: s.full_name,
      photo_url: s.photo_url,
      class_id: record?.class_id ?? s.class_id,
      class_name: record?.classes?.name ?? s.classes?.name ?? null,
      status: record?.status ?? "present",
    };
  });
}
