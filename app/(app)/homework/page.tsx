import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { listHomeworkForStaff, listHomeworkForFamily } from "@/lib/data/homework";
import { listClassOptions } from "@/lib/data/students";
import { listGradebookSubjects } from "@/lib/data/exams";
import { SetupNotice } from "@/components/setup-notice";
import { HomeworkStaffView } from "@/components/homework/homework-staff-view";
import { HomeworkFamilyView } from "@/components/homework/homework-family-view";

export default async function HomeworkPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="homework" />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  // Students and parents get the read-and-tick board; everyone else
  // (teachers, office, admin) gets the management view.
  if (profile?.role === "student" || profile?.role === "parent") {
    const rows = await listHomeworkForFamily();
    return <HomeworkFamilyView rows={rows} />;
  }

  const [rows, classes, subjects] = await Promise.all([
    listHomeworkForStaff(),
    listClassOptions(),
    listGradebookSubjects(),
  ]);
  return <HomeworkStaffView rows={rows} classes={classes} subjects={subjects} />;
}
