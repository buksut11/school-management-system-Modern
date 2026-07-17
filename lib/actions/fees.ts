"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";
import type { PaymentMethod } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function setStudentFee(_prev: FormState, formData: FormData): Promise<FormState> {
  const studentId = str(formData, "student_id");
  if (!studentId) return { error: "Missing student." };
  const amount = Number(str(formData, "amount") ?? 0);
  if (!(amount >= 0)) return { error: "Enter a valid annual fee." };
  const discount = Number(str(formData, "discount") ?? 0);
  if (!(discount >= 0)) return { error: "Enter a valid discount." };
  if (discount > amount) return { error: "The discount can't exceed the annual fee." };

  const supabase = await createClient();
  // Upserts the student's fee plan for the current year (migration 0037):
  // finance/admin only, validated in the database. Adjusting the current
  // year also refreshes students.base_fees, the default new years inherit.
  const { data, error } = await supabase.rpc("set_student_fee", {
    p_student_id: studentId,
    p_amount: amount,
    p_discount: discount,
    p_discount_reason: str(formData, "discount_reason"),
  });
  if (error) return { error: error.message };

  await logActivity(
    supabase,
    "fee",
    `Fee plan adjusted · ${data?.student_name ?? "Student"} · $${amount}${discount > 0 ? ` − $${discount} discount` : ""}`
  );
  revalidatePath("/", "layout");
  return { success: true };
}

export async function recordFeePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const studentId = str(formData, "student_id");
  const amount = Number(str(formData, "amount") ?? 0);
  if (!studentId) return { error: "Missing student." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const method = (str(formData, "method") ?? "cash") as PaymentMethod;
  const note = str(formData, "note");

  const supabase = await createClient();
  // Payment + numbered receipt happen atomically inside the database
  // (migration 0013): one transaction, a per-student lock against
  // concurrent submissions, and an overpayment guard. The function
  // raises a readable message when the amount exceeds the balance.
  const { data, error } = await supabase.rpc("record_fee_payment", {
    p_student_id: studentId,
    p_amount: amount,
    p_method: method,
    p_note: note,
  });
  if (error) return { error: error.message };

  await logActivity(supabase, "fee", `Fee payment received · ${data?.student_name ?? "Student"} · $${amount}`);

  revalidatePath("/", "layout");
  return { success: true };
}
