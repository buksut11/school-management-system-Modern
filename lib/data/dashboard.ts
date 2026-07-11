import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { getActiveCounts, getTodayAttendance } from "@/lib/data/shared";

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

  // Balances come pre-aggregated per student from the database view,
  // already scoped to the current academic year (migration 0017).
  const [{ students, teachers }, attendance, { count: feesOwing }, { data: expenses }] =
    await Promise.all([
      getActiveCounts(),
      getTodayAttendance(),
      supabase
        .from("student_fee_balances")
        .select("*", { count: "exact", head: true })
        .eq("student_status", "active")
        .gt("balance", 0),
      supabase.from("expenses").select("amount, paid"),
    ]);

  const expensesPending = (expenses ?? []).filter((e) => Number(e.paid) < Number(e.amount)).length;

  return {
    students,
    teachers,
    present: attendance.present,
    late: attendance.late,
    absent: attendance.absent,
    feesOwing: feesOwing ?? 0,
    expensesPending,
  };
}

export async function getDashboardData() {
  const supabase = await createClient();

  // Collection figures are for the current academic year, pre-aggregated
  // per student by the student_fee_balances view (migration 0017).
  const [{ students, teachers }, attendance, { data: recentActivity }, { data: feeBalances }] =
    await Promise.all([
      getActiveCounts(),
      getTodayAttendance(),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("student_fee_balances").select("due, paid").eq("student_status", "active"),
    ]);

  const totalMarked = attendance.present + attendance.late + attendance.absent;
  const attendanceRate = students > 0 ? Math.round((attendance.present / students) * 100) : 0;

  const feesExpected = (feeBalances ?? []).reduce((sum, r) => sum + Number(r.due), 0);
  const feesCollected = (feeBalances ?? []).reduce((sum, r) => sum + Number(r.paid), 0);
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
