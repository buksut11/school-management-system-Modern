import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listExams, listEligibleStudentsForExam } from "@/lib/data/exams";
import { listClassOptions } from "@/lib/data/students";
import { listAcademicYears, pickCurrentYear } from "@/lib/data/years";
import { SetupNotice } from "@/components/setup-notice";
import { ExamsView } from "@/components/exams/exams-view";
import { TERMS } from "@/lib/constants";
import type { Term } from "@/lib/types/database";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; year?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="exam records" />;
  }

  const { term: termParam, year: yearParam } = await searchParams;
  const term = (TERMS as readonly string[]).includes(termParam ?? "") ? (termParam as Term) : "Term 1";

  const years = await listAcademicYears();
  const year = years.find((y) => y.id === yearParam) ?? pickCurrentYear(years);

  const [rows, classes, eligibleStudents] = await Promise.all([
    listExams(term, year?.id ?? null),
    listClassOptions(),
    listEligibleStudentsForExam(term, year?.id ?? null),
  ]);

  return (
    <ExamsView
      key={`${term}-${year?.id ?? "all"}`}
      term={term}
      year={year}
      years={years}
      rows={rows}
      classes={classes}
      eligibleStudents={eligibleStudents}
    />
  );
}
