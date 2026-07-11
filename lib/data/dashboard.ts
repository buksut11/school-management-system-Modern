import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { getActiveCounts, getTodayAttendance } from "@/lib/data/shared";
import { getCurrentYearId } from "@/lib/data/years";

export type SidebarCounts = {
  students: number;
  teachers: number;
  present: number;
  late: number;
  absent: number;
  feesOwing: number;
  expensesPending: number;
};

export async function getSidebarCounts(): Promise<SidebarCounts> {
  const supabase = await createClient();

  // Fee balances count only the current academic year's payments.
  const yearId = await getCurrentYearId();
  let paymentsQuery = supabase.from("fee_payments").select("student_id, amount");
  if (yearId) paymentsQuery = paymentsQuery.eq("year_id", yearId);

  const [{ students, teachers }, attendance, { data: feeStudents }, { data: feePayments }, { data: expenses }] =
    await Promise.all([
      getActiveCounts(),
      getTodayAttendance(),
      supabase.from("students").select("id, base_fees").eq("status", "active"),
      paymentsQuery,
      supabase.from("expenses").select("amount, paid"),
    ]);

  const collectedByStudent = new Map<string, number>();
  (feePayments ?? []).forEach((p) => {
    collectedByStudent.set(p.student_id, (collectedByStudent.get(p.student_id) ?? 0) + Number(p.amount));
  });
  const feesOwing = (feeStudents ?? []).filter(
    (s) => Number(s.base_fees) - (collectedByStudent.get(s.id) ?? 0) > 0
  ).length;

  const expensesPending = (expenses ?? []).filter((e) => Number(e.paid) < Number(e.amount)).length;

  return {
    students,
    teachers,
    present: attendance.present,
    late: attendance.late,
    absent: attendance.absent,
    feesOwing,
    expensesPending,
  };
}

export async function getDashboardData() {
  const supabase = await createClient();

  // Collection figures are for the current academic year.
  const yearId = await getCurrentYearId();
  let paymentsQuery = supabase.from("fee_payments").select("amount");
  if (yearId) paymentsQuery = paymentsQuery.eq("year_id", yearId);

  const [{ students, teachers }, attendance, { data: recentActivity }, { data: feeStudents }, { data: feePayments }] =
    await Promise.all([
      getActiveCounts(),
      getTodayAttendance(),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("students").select("base_fees").eq("status", "active"),
      paymentsQuery,
    ]);

  const totalMarked = attendance.present + attendance.late + attendance.absent;
  const attendanceRate = students > 0 ? Math.round((attendance.present / students) * 100) : 0;

  const feesExpected = (feeStudents ?? []).reduce((sum, s) => sum + Number(s.base_fees), 0);
  const feesCollected = (feePayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const feesRate = feesExpected > 0 ? Math.round((feesCollected / feesExpected) * 100) : 0;

  return {
    studentCount: students,
    teacherCount: teachers,
    present: attendance.present,
    late: attendance.late,
    absent: attendance.absent,
    totalMarked,
    attendanceRate,
    feesCollected,
    feesRate,
    activity: (recentActivity ?? []).map((a) => ({
      id: a.id,
      message: a.message,
      kind: a.kind,
      time: relativeTime(a.created_at),
      actorName: a.actor_name,
    })),
  };
}
