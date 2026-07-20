import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { listTimetableSlots, listLessons, listTeacherSubjectPairs } from "@/lib/data/timetable";
import { listClassOptions } from "@/lib/data/students";
import { listGradebookSubjects } from "@/lib/data/exams";
import { listTeacherOptions } from "@/lib/data/teachers";
import { SetupNotice } from "@/components/setup-notice";
import { TimetableView } from "@/components/timetable/timetable-view";
import type { Role } from "@/lib/types/database";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="the timetable" />;
  }

  const { class: classParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const role: Role = profile?.role ?? "staff";

  const [classes, slots, subjects, teachers, teacherSubjects] = await Promise.all([
    listClassOptions(),
    listTimetableSlots(),
    listGradebookSubjects(),
    listTeacherOptions(),
    listTeacherSubjectPairs(),
  ]);

  const selected = classes.find((c) => c.id === classParam) ?? classes[0] ?? null;
  const lessons = selected ? await listLessons(selected.id) : [];

  return (
    <TimetableView
      key={selected?.id ?? "none"}
      classes={classes}
      selectedClassId={selected?.id ?? null}
      slots={slots}
      lessons={lessons}
      subjects={subjects}
      teachers={teachers}
      teacherSubjects={teacherSubjects}
      canEdit={role === "admin" || role === "staff"}
    />
  );
}
