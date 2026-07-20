// Grade letters mirror public.exam_grade() in the database (migration
// 0035), which is the authority — save_exam computes and stores each
// exam's grade there. This copy exists for DISPLAY math over
// already-stored totals (e.g. the academic-records average), where a
// round trip per row would be wasteful.
export function gradeForTotal(total: number, subjectCount: number) {
  const max = 100 * (Math.max(subjectCount, 0) + 1);
  const pct = (total / max) * 100;
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}
