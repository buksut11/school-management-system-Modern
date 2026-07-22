import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listTeachers } from "@/lib/data/teachers";
import { listClassOptions } from "@/lib/data/students";
import { listGradebookSubjects } from "@/lib/data/exams";
import { SetupNotice } from "@/components/setup-notice";
import { TeachersView } from "@/components/teachers/teachers-view";

export default async function TeachersPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="teachers" />;
  }

  const [firstPage, classes, subjects] = await Promise.all([
    listTeachers(),
    listClassOptions(),
    listGradebookSubjects(),
  ]);

  return <TeachersView initial={firstPage} classes={classes} subjects={subjects} />;
}
