"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const SNAPSHOT_VERSION = 2;

export type BackupSnapshot = {
  version: number;
  // The school's display name at backup time (v1 files hard-coded one
  // school's name here; it's informational only now).
  school: string;
  // Which tenant this snapshot came from. v1 files don't carry it; the
  // restore treats those as same-school (they predate multi-tenancy).
  school_id?: string;
  created_at: string;
  data: {
    departments: unknown[];
    classes: unknown[];
    teachers: unknown[];
    subjects: unknown[];
    students: unknown[];
    attendance: unknown[];
    exams: unknown[];
    fee_payments: unknown[];
    expenses: unknown[];
    // Added later — older backup files won't have these keys.
    invoices?: unknown[];
    receipts?: unknown[];
    academic_years?: unknown[];
    enrollments?: unknown[];
    expense_payments?: unknown[];
    exam_scores?: unknown[];
    teacher_subjects?: unknown[];
    student_fees?: unknown[];
    fee_installments?: unknown[];
    timetable_slots?: unknown[];
    lessons?: unknown[];
    notifications?: unknown[];
  };
}

async function isCurrentUserAdmin(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin";
}

export async function createBackupSnapshot(): Promise<BackupSnapshot> {
  const supabase = await createClient();

  // RLS scopes every read below to the caller's school; stamp which
  // school that is so the file can't later be restored somewhere else
  // by accident.
  const { data: school } = await supabase.from("schools").select("id, name").single();

  const [departments, classes, teachers, subjects, teacherSubjects, timetableSlots, lessons, students, studentFees, feeInstallments, notifications, attendance, exams, examScores, feePayments, expenses, expensePayments, invoices, receipts, academicYears, enrollments] =
    await Promise.all([
      supabase.from("departments").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("teacher_subjects").select("*"),
      supabase.from("timetable_slots").select("*"),
      supabase.from("lessons").select("*"),
      supabase.from("students").select("*"),
      supabase.from("student_fees").select("*"),
      supabase.from("fee_installments").select("*"),
      supabase.from("notifications").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("exams").select("*"),
      supabase.from("exam_scores").select("*"),
      supabase.from("fee_payments").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("expense_payments").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("receipts").select("*"),
      supabase.from("academic_years").select("*"),
      supabase.from("enrollments").select("*"),
    ]);

  await logActivity(supabase, "backup", "Downloaded system backup");

  return {
    version: SNAPSHOT_VERSION,
    school: school?.name ?? "School",
    school_id: school?.id,
    created_at: new Date().toISOString(),
    data: {
      departments: departments.data ?? [],
      classes: classes.data ?? [],
      teachers: teachers.data ?? [],
      subjects: subjects.data ?? [],
      teacher_subjects: teacherSubjects.data ?? [],
      timetable_slots: timetableSlots.data ?? [],
      lessons: lessons.data ?? [],
      students: students.data ?? [],
      student_fees: studentFees.data ?? [],
      fee_installments: feeInstallments.data ?? [],
      notifications: notifications.data ?? [],
      attendance: attendance.data ?? [],
      exams: exams.data ?? [],
      exam_scores: examScores.data ?? [],
      fee_payments: feePayments.data ?? [],
      expenses: expenses.data ?? [],
      expense_payments: expensePayments.data ?? [],
      invoices: invoices.data ?? [],
      receipts: receipts.data ?? [],
      academic_years: academicYears.data ?? [],
      enrollments: enrollments.data ?? [],
    },
  };
}

export type RestoreResult = { error?: string; success?: boolean };

export async function restoreFromBackup(password: string, snapshot: BackupSnapshot): Promise<RestoreResult> {
  const t = await getT();
  if (!snapshot?.data || typeof snapshot.data !== "object") {
    return { error: t("err.notBackupFile") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: t("err.notSignedIn") };

  // Reauthenticating proves *this* user's password, not that they're
  // authorized for a whole-system wipe — check role explicitly rather
  // than relying only on RLS.
  if (!(await isCurrentUserAdmin(supabase))) {
    return { error: t("err.onlyAdminRestore") };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) return { error: t("err.incorrectPassword") };

  // The entire wipe-and-reload runs as ONE database transaction
  // (migration 0032): any failure rolls the whole thing back, so the
  // school's data is never left half-restored. The function also
  // re-checks the admin role, rejects snapshots stamped with a different
  // school, and re-stamps every row with the caller's school — a foreign
  // file can't smuggle rows into another tenant.
  const { error } = await supabase.rpc("restore_school_snapshot", {
    p_data: snapshot.data as never,
    p_school_id: snapshot.school_id ?? null,
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "backup", "Restored system from backup");
  revalidatePath("/", "layout");
  return { success: true };
}
