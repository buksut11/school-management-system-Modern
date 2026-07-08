import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types/database";

export type ExpenseRow = Expense & {
  balance: number;
  status: "paid" | "partial" | "unpaid";
};

export async function listExpenses(): Promise<ExpenseRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });

  return (data ?? []).map((e) => {
    const amount = Number(e.amount);
    const paid = Number(e.paid);
    const balance = Math.max(0, amount - paid);
    const status: ExpenseRow["status"] = balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    return { ...e, amount, paid, balance, status };
  });
}
