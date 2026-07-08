import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listDepartments } from "@/lib/data/academics";
import { listTeacherOptions } from "@/lib/data/teachers";
import { SetupNotice } from "@/components/setup-notice";
import { DepartmentsView } from "@/components/departments/departments-view";

export default async function DepartmentsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="departments" />;
  }

  const [departments, teachers] = await Promise.all([listDepartments(), listTeacherOptions()]);

  return <DepartmentsView departments={departments} teachers={teachers} />;
}
