"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";

export async function saveLesson(input: {
  classId: string;
  day: number;
  slotId: string;
  subjectId: string;
  teacherId: string | null;
}): Promise<FormState> {
  if (!input.classId || !input.slotId) return { error: "Missing class or period." };
  if (!input.subjectId) return { error: "Pick a subject for this lesson." };

  const supabase = await createClient();
  // Upserts the grid cell in the database (migration 0039); a teacher
  // double-booking comes back as a readable message naming the class
  // they're already teaching.
  const { error } = await supabase.rpc("save_lesson", {
    p_class_id: input.classId,
    p_day: input.day,
    p_slot_id: input.slotId,
    p_subject_id: input.subjectId,
    p_teacher_id: input.teacherId,
  });
  if (error) return { error: friendlyError(error) };

  revalidatePath("/timetable");
  return { success: true };
}

export async function clearLesson(classId: string, day: number, slotId: string): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("class_id", classId)
    .eq("day", day)
    .eq("slot_id", slotId);
  if (error) return { error: friendlyError(error) };

  revalidatePath("/timetable");
  return { success: true };
}

export type SlotInput = { id?: string; name: string; starts_at: string; ends_at: string };

export async function saveTimetableSlots(items: SlotInput[]): Promise<FormState> {
  const cleaned = (items ?? [])
    .map((it) => ({
      id: it.id,
      name: it.name?.trim() ?? "",
      starts_at: it.starts_at?.trim() ?? "",
      ends_at: it.ends_at?.trim() ?? "",
    }))
    .filter((it) => it.name || it.starts_at || it.ends_at);

  const supabase = await createClient();
  // Updates kept periods in place (their lessons survive), inserts new
  // ones, removes the rest — all validated in the database (0039).
  const { data, error } = await supabase.rpc("set_timetable_slots", { p_items: cleaned });
  if (error) return { error: friendlyError(error) };

  await logActivity(
    supabase,
    "timetable",
    `Period grid updated · ${data?.count ?? 0} period${(data?.count ?? 0) === 1 ? "" : "s"}`
  );
  revalidatePath("/timetable");
  return { success: true };
}
