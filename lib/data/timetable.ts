import { createClient } from "@/lib/supabase/server";

// day is 0=Monday … 6=Sunday (the schema supports all seven; which days
// a school uses is a UI concern — see TIMETABLE_DAYS in the view).

export type TimetableSlot = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
};

export type Lesson = {
  id: string;
  class_id: string;
  slot_id: string;
  day: number;
  subject_id: string;
  subject_name: string;
  teacher_id: string | null;
  teacher_name: string | null;
};

type RawLesson = {
  id: string;
  class_id: string;
  slot_id: string;
  day: number;
  subject_id: string;
  teacher_id: string | null;
  subjects: { name: string } | null;
  teachers: { full_name: string } | null;
};

export async function listTimetableSlots(): Promise<TimetableSlot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_slots")
    .select("id, name, starts_at, ends_at")
    .order("starts_at");
  return data ?? [];
}

export async function listLessons(classId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("id, class_id, slot_id, day, subject_id, teacher_id, subjects(name), teachers(full_name)")
    .eq("class_id", classId)
    .returns<RawLesson[]>();

  return (data ?? []).map((l) => ({
    id: l.id,
    class_id: l.class_id,
    slot_id: l.slot_id,
    day: l.day,
    subject_id: l.subject_id,
    subject_name: l.subjects?.name ?? "—",
    teacher_id: l.teacher_id,
    teacher_name: l.teachers?.full_name ?? null,
  }));
}

// teacher_id → subject_ids they teach, so the lesson editor can suggest
// the right teachers first.
export async function listTeacherSubjectPairs(): Promise<{ teacher_id: string; subject_id: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teacher_subjects").select("teacher_id, subject_id");
  return data ?? [];
}
