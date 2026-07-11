import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listAcademicRecords } from "@/lib/data/exams";
import { listClassOptions } from "@/lib/data/students";
import { listAcademicYears, pickCurrentYear } from "@/lib/data/years";
import { SetupNotice } from "@/components/setup-notice";
import { AcademicRecordsView } from "@/components/academic-records/academic-records-view";

export default async function AcademicRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="academic records" />;
  }

  const { year: yearParam } = await searchParams;
  const years = await listAcademicYears();
  const year = years.find((y) => y.id === yearParam) ?? pickCurrentYear(years);

  const [records, classes] = await Promise.all([
    listAcademicRecords(year?.id ?? null),
    listClassOptions(),
  ]);

  return (
    <AcademicRecordsView
      key={year?.id ?? "all"}
      records={records}
      classes={classes}
      year={year}
      years={years}
    />
  );
}
