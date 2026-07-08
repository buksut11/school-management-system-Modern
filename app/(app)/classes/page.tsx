import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listClasses } from "@/lib/data/classes";
import { listTeacherOptions } from "@/lib/data/teachers";
import { SetupNotice } from "@/components/setup-notice";
import { ClassesView } from "@/components/classes/classes-view";

export default async function ClassesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="classes" />;
  }

  const [classes, teachers] = await Promise.all([listClasses(), listTeacherOptions()]);

  return <ClassesView classes={classes} teachers={teachers} />;
}
