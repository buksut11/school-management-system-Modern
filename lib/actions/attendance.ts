"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAttendance(
  studentId: string,
  date: string,
  status: "present" | "late" | "absent"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .upsert({ student_id: studentId, date, status }, { onConflict: "student_id,date" });
  if (error) throw new Error(error.message);

  if (status !== "present") {
    const { data: student } = await supabase
      .from("students")
      .select("full_name")
      .eq("id", studentId)
      .single();
    await supabase.from("activity_log").insert({
      kind: "attendance",
      message: `Marked ${status} · ${student?.full_name ?? "Student"}`,
    });
  }

  revalidatePath("/", "layout");
}
