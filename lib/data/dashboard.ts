import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";

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
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: students },
    { count: teachers },
    { data: attendance },
    { data: feeStudents },
    { data: feePayments },
    { data: expenses },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("teachers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("attendance").select("status").eq("date", today),
    supabase.from("students").select("id, base_fees").eq("status", "active"),
    supabase.from("fee_payments").select("student_id, amount"),
    supabase.from("expenses").select("amount, paid"),
  ]);

  const present = attendance?.filter((a) => a.status === "present").length ?? 0;
  const late = attendance?.filter((a) => a.status === "late").length ?? 0;
  const absent = attendance?.filter((a) => a.status === "absent").length ?? 0;

  const collectedByStudent = new Map<string, number>();
  (feePayments ?? []).forEach((p) => {
    collectedByStudent.set(p.student_id, (collectedByStudent.get(p.student_id) ?? 0) + Number(p.amount));
  });
  const feesOwing = (feeStudents ?? []).filter(
    (s) => Number(s.base_fees) - (collectedByStudent.get(s.id) ?? 0) > 0
  ).length;

  const expensesPending = (expenses ?? []).filter((e) => Number(e.paid) < Number(e.amount)).length;

  return {
    students: students ?? 0,
    teachers: teachers ?? 0,
    present,
    late,
    absent,
    feesOwing,
    expensesPending,
  };
}

export async function getDashboardData() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: studentCount },
    { count: teacherCount },
    { data: attendanceToday },
    { data: recentActivity },
    { data: feeStudents },
    { data: feePayments },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("teachers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("attendance").select("status").eq("date", today),
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("students").select("base_fees").eq("status", "active"),
    supabase.from("fee_payments").select("amount"),
  ]);

  const present = attendanceToday?.filter((a) => a.status === "present").length ?? 0;
  const late = attendanceToday?.filter((a) => a.status === "late").length ?? 0;
  const absent = attendanceToday?.filter((a) => a.status === "absent").length ?? 0;
  const totalMarked = present + late + absent;
  const students = studentCount ?? 0;
  const attendanceRate = students > 0 ? Math.round((present / students) * 100) : 0;

  const feesExpected = (feeStudents ?? []).reduce((sum, s) => sum + Number(s.base_fees), 0);
  const feesCollected = (feePayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const feesRate = feesExpected > 0 ? Math.round((feesCollected / feesExpected) * 100) : 0;

  return {
    studentCount: students,
    teacherCount: teacherCount ?? 0,
    present,
    late,
    absent,
    totalMarked,
    attendanceRate,
    feesCollected,
    feesRate,
    activity: (recentActivity ?? []).map((a) => ({
      id: a.id,
      message: a.message,
      kind: a.kind,
      time: relativeTime(a.created_at),
    })),
  };
}
