import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listStudents, listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { StudentsView } from "@/components/students/students-view";

export default async function StudentsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="students" />;
  }

  const [students, classes] = await Promise.all([listStudents(), listClassOptions()]);

  return <StudentsView students={students} classes={classes} />;
}
