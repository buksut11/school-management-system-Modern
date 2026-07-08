"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export async function setAttendance(
  studentId: string,
  date: string,
  status: "present" | "late" | "absent"
) {
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("full_name, class_id")
    .eq("id", studentId)
    .single();

  const { error } = await supabase.from("attendance").upsert(
    { student_id: studentId, date, status, class_id: student?.class_id ?? null },
    { onConflict: "student_id,date" }
  );
  if (error) throw new Error(error.message);

  if (status !== "present") {
    await logActivity(supabase, "attendance", `Marked ${status} · ${student?.full_name ?? "Student"}`);
  }

  revalidatePath("/", "layout");
}
