"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

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
    // Added later — older backup files won't have these keys.
    invoices?: unknown[];
    receipts?: unknown[];
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

  const [departments, classes, teachers, subjects, students, attendance, exams, feePayments, expenses, invoices, receipts] =
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
      supabase.from("invoices").select("*"),
      supabase.from("receipts").select("*"),
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
      invoices: invoices.data ?? [],
      receipts: receipts.data ?? [],
    },
  };
}

export type RestoreResult = { error?: string; success?: boolean };

// Deletes are checked individually — an RLS policy silently blocking one
// (0 rows affected, no thrown error) must not be treated as success, or a
// restore could leave the database half-wiped, half-restored.
async function clearTable(supabase: SupabaseClient<Database>, table: string) {
  const { error } = await supabase
    .from(table as never)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`Couldn't clear ${table}: ${error.message}`);
}

export async function restoreFromBackup(password: string, snapshot: BackupSnapshot): Promise<RestoreResult> {
  if (snapshot.school !== "Sh.Asharow Primary & Secondary School" || !snapshot.data) {
    return { error: "This file doesn't look like a Sh.Asharow backup." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in." };

  // Reauthenticating proves *this* user's password, not that they're
  // authorized for a whole-system wipe — check role explicitly rather
  // than relying only on RLS (which may not be locked down yet).
  if (!(await isCurrentUserAdmin(supabase))) {
    return { error: "Only an admin account can restore from backup." };
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) return { error: "Incorrect password." };

  const { data } = snapshot;

  try {
    // Delete children before parents so foreign keys never dangle mid-restore.
    for (const table of [
      "receipts",
      "invoices",
      "attendance",
      "exams",
      "fee_payments",
      "expenses",
      "subjects",
      "students",
      "teachers",
      "classes",
      "departments",
    ]) {
      await clearTable(supabase, table);
    }

    // Insert parents before children. Classes and teachers reference each
    // other, so classes go in with teacher_id cleared, then get patched
    // once teachers exist.
    if (data.departments.length) {
      const { error } = await supabase.from("departments").insert(data.departments as never[]);
      if (error) throw new Error(error.message);
    }

    const classesNoTeacher = (data.classes as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      teacher_id: null,
    }));
    if (classesNoTeacher.length) {
      const { error } = await supabase.from("classes").insert(classesNoTeacher as never[]);
      if (error) throw new Error(error.message);
    }

    if (data.teachers.length) {
      const { error } = await supabase.from("teachers").insert(data.teachers as never[]);
      if (error) throw new Error(error.message);
    }

    for (const c of data.classes as Array<Record<string, unknown>>) {
      if (c.teacher_id) {
        await supabase.from("classes").update({ teacher_id: c.teacher_id as string }).eq("id", c.id as string);
      }
    }

    for (const [table, rows] of [
      ["subjects", data.subjects],
      ["students", data.students],
      ["attendance", data.attendance],
      ["exams", data.exams],
      ["fee_payments", data.fee_payments],
      ["expenses", data.expenses],
      ["invoices", data.invoices ?? []],
      ["receipts", data.receipts ?? []],
    ] as const) {
      if (rows.length) {
        const { error } = await supabase.from(table).insert(rows as never[]);
        if (error) throw new Error(`Couldn't restore ${table}: ${error.message}`);
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Restore failed partway through." };
  }

  await logActivity(supabase, "backup", "Restored system from backup");
  revalidatePath("/", "layout");
  return { success: true };
}
