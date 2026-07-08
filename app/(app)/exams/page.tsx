import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listExams, listEligibleStudentsForExam } from "@/lib/data/exams";
import { listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { ExamsView } from "@/components/exams/exams-view";
import { TERMS } from "@/lib/constants";
import type { Term } from "@/lib/types/database";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="exam records" />;
  }

  const { term: termParam } = await searchParams;
  const term = (TERMS as readonly string[]).includes(termParam ?? "") ? (termParam as Term) : "Term 1";

  const [rows, classes, eligibleStudents] = await Promise.all([
    listExams(term),
    listClassOptions(),
    listEligibleStudentsForExam(term),
  ]);

  return (
    <ExamsView key={term} term={term} rows={rows} classes={classes} eligibleStudents={eligibleStudents} />
  );
}
