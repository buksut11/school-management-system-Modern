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

export async function recordFeePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const studentId = str(formData, "student_id");
  const amount = Number(str(formData, "amount") ?? 0);
  if (!studentId) return { error: "Missing student." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const method = (str(formData, "method") ?? "cash") as PaymentMethod;
  const note = str(formData, "note");

  const supabase = await createClient();
  const { error } = await supabase.from("fee_payments").insert({
    student_id: studentId,
    amount,
    method,
    note,
  });
  if (error) return { error: error.message };

  const { data: student } = await supabase
    .from("students")
    .select("full_name, mobile, address, parent_mobile, classes(name)")
    .eq("id", studentId)
    .single<{
      full_name: string;
      mobile: string | null;
      address: string | null;
      parent_mobile: string | null;
      classes: { name: string } | null;
    }>();

  // Every fee payment also issues a numbered receipt (Invoices & Receipts
  // page), carrying the student's contact + parent details. Best-effort:
  // if the receipts migration (0011/0012) hasn't been applied yet, the
  // payment itself still goes through.
  await supabase.from("receipts").insert({
    party_type: "student",
    party_id: studentId,
    party_name: student?.full_name ?? "Student",
    party_detail: student?.classes?.name ?? null,
    party_phone: student?.mobile ?? null,
    party_address: student?.address ?? null,
    parent_phone: student?.parent_mobile ?? null,
    amount,
    method,
    note: note ?? "School fees",
  });

  await logActivity(supabase, "fee", `Fee payment received · ${student?.full_name ?? "Student"} · $${amount}`);

  revalidatePath("/", "layout");
  return { success: true };
}
