"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/students";
import type { PaymentMethod } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function recordFeePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const studentId = str(formData, "student_id");
  const amount = Number(str(formData, "amount") ?? 0);
  if (!studentId) return { error: "Missing student." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("fee_payments").insert({
    student_id: studentId,
    amount,
    method: (str(formData, "method") ?? "cash") as PaymentMethod,
    note: str(formData, "note"),
  });
  if (error) return { error: error.message };

  const { data: student } = await supabase.from("students").select("full_name").eq("id", studentId).single();
  await supabase.from("activity_log").insert({
    kind: "fee",
    message: `Fee payment received · ${student?.full_name ?? "Student"} · $${amount}`,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
