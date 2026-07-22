"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";
import type { ExpenseCategory, PaymentMethod } from "@/lib/types/database";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function saveExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const payee = str(formData, "payee");
  if (!payee) return { error: (await getT())("err.payeeRequired") };

  const supabase = await createClient();
  const record = {
    payee,
    category: (str(formData, "category") ?? "other") as ExpenseCategory,
    description: str(formData, "description"),
    amount: Number(str(formData, "amount") ?? 0),
    date: str(formData, "date") ?? new Date().toISOString().slice(0, 10),
    method: (str(formData, "method") ?? "cash") as PaymentMethod,
  };

  const query = id ? supabase.from("expenses").update(record).eq("id", id) : supabase.from("expenses").insert({ ...record, paid: 0 });
  const { error } = await query;
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "expense", `${id ? "Updated" : "New"} expense · ${payee}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteExpense(id: string, payee: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
  await logActivity(supabase, "expense", `Removed expense · ${payee}`);
  revalidatePath("/", "layout");
}

export async function recordExpensePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const amount = Number(str(formData, "amount") ?? 0);
  const t = await getT();
  if (!id) return { error: t("err.missingExpense") };
  if (!(amount > 0)) return { error: t("err.amountPositive") };

  const supabase = await createClient();
  // Ledger row, running total and (for salaries) the numbered staff
  // receipt all happen atomically in the database (migration 0031),
  // under a per-expense lock — concurrent payments can no longer lose an
  // update, and overshooting the outstanding amount is rejected with a
  // readable message instead of being silently clamped.
  const { data, error } = await supabase.rpc("record_expense_payment", {
    p_expense_id: id,
    p_amount: amount,
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "expense", `Paid $${amount} · ${data?.payee ?? "payee"}`);
  revalidatePath("/", "layout");
  return { success: true };
}
