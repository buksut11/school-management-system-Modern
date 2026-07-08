import { GRADEBOOK_SUBJECTS } from "@/lib/constants";

export function computeTotal(subjectScores: Record<string, number>, testScore: number) {
  const subjectTotal = GRADEBOOK_SUBJECTS.reduce((sum, subj) => sum + (Number(subjectScores[subj]) || 0), 0);
  return subjectTotal + (Number(testScore) || 0);
}

export function computeGrade(total: number) {
  const max = GRADEBOOK_SUBJECTS.length * 100 + 100;
  const pct = (total / max) * 100;
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}
