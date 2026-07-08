import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listAcademicRecords } from "@/lib/data/exams";
import { listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { AcademicRecordsView } from "@/components/academic-records/academic-records-view";

export default async function AcademicRecordsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="academic records" />;
  }

  const [records, classes] = await Promise.all([listAcademicRecords(), listClassOptions()]);

  return <AcademicRecordsView records={records} classes={classes} />;
}
