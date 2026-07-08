import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listTeachers } from "@/lib/data/teachers";
import { listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { TeachersView } from "@/components/teachers/teachers-view";

export default async function TeachersPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="teachers" />;
  }

  const [teachers, classes] = await Promise.all([listTeachers(), listClassOptions()]);

  return <TeachersView teachers={teachers} classes={classes} />;
}
