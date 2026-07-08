"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

const SNAPSHOT_VERSION = 1;

export type BackupSnapshot = {
  version: number;
  school: string;
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
  };
}

export async function createBackupSnapshot(): Promise<BackupSnapshot> {
  const supabase = await createClient();

  const [departments, classes, teachers, subjects, students, attendance, exams, feePayments, expenses] =
    await Promise.all([
      supabase.from("departments").select("*"),
      supabase.from("classes").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("students").select("*"),
      supabase.from("attendance").select("*"),
      supabase.from("exams").select("*"),
      supabase.from("fee_payments").select("*"),
      supabase.from("expenses").select("*"),
    ]);

  await logActivity(supabase, "backup", "Downloaded system backup");

  return {
    version: SNAPSHOT_VERSION,
    school: "Sh.Asharow Primary & Secondary School",
    created_at: new Date().toISOString(),
    data: {
      departments: departments.data ?? [],
      classes: classes.data ?? [],
      teachers: teachers.data ?? [],
      subjects: subjects.data ?? [],
      students: students.data ?? [],
      attendance: attendance.data ?? [],
      exams: exams.data ?? [],
      fee_payments: feePayments.data ?? [],
      expenses: expenses.data ?? [],
    },
  };
}

export type RestoreResult = { error?: string; success?: boolean };

export async function restoreFromBackup(password: string, snapshot: BackupSnapshot): Promise<RestoreResult> {
  if (snapshot.school !== "Sh.Asharow Primary & Secondary School" || !snapshot.data) {
    return { error: "This file doesn't look like a Sh.Asharow backup." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in." };

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) return { error: "Incorrect password." };

  const { data } = snapshot;

  // Delete children before parents so foreign keys never dangle mid-restore.
  await supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("exams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("fee_payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("teachers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("classes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("departments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Insert parents before children. Classes and teachers reference each
  // other, so classes go in with teacher_id cleared, then get patched once
  // teachers exist.
  if (data.departments.length) await supabase.from("departments").insert(data.departments as never[]);

  const classesNoTeacher = (data.classes as Array<Record<string, unknown>>).map((c) => ({
    ...c,
    teacher_id: null,
  }));
  if (classesNoTeacher.length) await supabase.from("classes").insert(classesNoTeacher as never[]);

  if (data.teachers.length) await supabase.from("teachers").insert(data.teachers as never[]);

  for (const c of data.classes as Array<Record<string, unknown>>) {
    if (c.teacher_id) {
      await supabase.from("classes").update({ teacher_id: c.teacher_id as string }).eq("id", c.id as string);
    }
  }

  if (data.subjects.length) await supabase.from("subjects").insert(data.subjects as never[]);
  if (data.students.length) await supabase.from("students").insert(data.students as never[]);
  if (data.attendance.length) await supabase.from("attendance").insert(data.attendance as never[]);
  if (data.exams.length) await supabase.from("exams").insert(data.exams as never[]);
  if (data.fee_payments.length) await supabase.from("fee_payments").insert(data.fee_payments as never[]);
  if (data.expenses.length) await supabase.from("expenses").insert(data.expenses as never[]);

  await logActivity(supabase, "backup", "Restored system from backup");
  revalidatePath("/", "layout");
  return { success: true };
}
