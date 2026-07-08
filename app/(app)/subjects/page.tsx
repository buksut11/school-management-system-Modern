import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listSubjects, listDepartmentOptions } from "@/lib/data/academics";
import { listTeacherOptions } from "@/lib/data/teachers";
import { SetupNotice } from "@/components/setup-notice";
import { SubjectsView } from "@/components/subjects/subjects-view";

export default async function SubjectsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="subjects" />;
  }

  const [subjects, departments, teachers] = await Promise.all([
    listSubjects(),
    listDepartmentOptions(),
    listTeacherOptions(),
  ]);

  return <SubjectsView subjects={subjects} departments={departments} teachers={teachers} />;
}
