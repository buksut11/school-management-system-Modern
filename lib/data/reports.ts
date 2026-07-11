import { createClient } from "@/lib/supabase/server";
import { getCurrentYearId } from "@/lib/data/years";

function lastNDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export type AttendanceTrendPoint = { date: string; present: number; late: number; absent: number };

export async function getAttendanceTrend(days = 30): Promise<AttendanceTrendPoint[]> {
  const supabase = await createClient();
  const range = lastNDays(days);
  const { data } = await supabase
    .from("attendance")
    .select("date, status")
    .gte("date", range[0])
    .lte("date", range[range.length - 1]);

  const byDate = new Map<string, { present: number; late: number; absent: number }>();
  for (const day of range) byDate.set(day, { present: 0, late: 0, absent: 0 });
  for (const row of data ?? []) {
    const bucket = byDate.get(row.date);
    if (bucket) bucket[row.status as "present" | "late" | "absent"]++;
  }

  return range.map((date) => ({ date, ...byDate.get(date)! }));
}

export type FeeTrendPoint = { date: string; collected: number };

export async function getFeeCollectionTrend(days = 30): Promise<FeeTrendPoint[]> {
  const supabase = await createClient();
  const range = lastNDays(days);
  const { data } = await supabase
    .from("fee_payments")
    .select("amount, paid_at")
    .gte("paid_at", `${range[0]}T00:00:00.000Z`);

  const byDate = new Map<string, number>();
  for (const day of range) byDate.set(day, 0);
  for (const row of data ?? []) {
    const day = row.paid_at.slice(0, 10);
    if (byDate.has(day)) byDate.set(day, (byDate.get(day) ?? 0) + Number(row.amount));
  }

  return range.map((date) => ({ date, collected: byDate.get(date) ?? 0 }));
}

export type ClassPerformancePoint = { className: string; average: number; studentCount: number };

export async function getClassPerformance(): Promise<ClassPerformancePoint[]> {
  const supabase = await createClient();
  // Averages are for the current academic year — mixing years would blur
  // the chart as history accumulates.
  const yearId = await getCurrentYearId();
  let query = supabase.from("exams").select("total_score, classes(name)");
  if (yearId) query = query.eq("year_id", yearId);
  const { data } = await query.returns<Array<{ total_score: number; classes: { name: string } | null }>>();

  const byClass = new Map<string, number[]>();
  for (const row of data ?? []) {
    const name = row.classes?.name ?? "Unassigned";
    if (!byClass.has(name)) byClass.set(name, []);
    byClass.get(name)!.push(Number(row.total_score));
  }

  return Array.from(byClass.entries())
    .map(([className, scores]) => ({
      className,
      average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      studentCount: scores.length,
    }))
    .sort((a, b) => b.average - a.average);
}

export type ExpenseCategoryPoint = { category: string; total: number };

export async function getExpensesByCategory(): Promise<ExpenseCategoryPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("category, amount");

  const byCategory = new Map<string, number>();
  for (const row of data ?? []) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + Number(row.amount));
  }

  return Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}
