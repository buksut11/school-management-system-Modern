"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  if (!payee) return { error: "Payee is required." };

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
  if (error) return { error: error.message };

  await logActivity(supabase, "expense", `${id ? "Updated" : "New"} expense · ${payee}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteExpense(id: string, payee: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, "expense", `Removed expense · ${payee}`);
  revalidatePath("/", "layout");
}

export async function recordExpensePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const amount = Number(str(formData, "amount") ?? 0);
  if (!id) return { error: "Missing expense." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: expense } = await supabase
    .from("expenses")
    .select("payee, category, description, amount, paid, method")
    .eq("id", id)
    .single();
  if (!expense) return { error: "Expense not found." };

  const newPaid = Math.min(Number(expense.amount), Number(expense.paid) + amount);
  const { error } = await supabase.from("expenses").update({ paid: newPaid }).eq("id", id);
  if (error) return { error: error.message };

  // Salary payments are wages to a person (teacher, cleaner, watchman, …),
  // so each one also issues a numbered receipt on the Invoices & Receipts
  // page. Other categories (rent, utilities, …) pay companies, not staff.
  // Best-effort: if the receipts migration (0011) hasn't been applied yet,
  // the payment itself still goes through.
  if (expense.category === "salaries") {
    await supabase.from("receipts").insert({
      party_type: "staff",
      party_id: null,
      party_name: expense.payee,
      party_detail: "Salary",
      amount,
      method: expense.method,
      note: expense.description,
    });
  }

  await logActivity(supabase, "expense", `Paid $${amount} · ${expense.payee}`);
  revalidatePath("/", "layout");
  return { success: true };
}
