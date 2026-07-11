import { createClient } from "@/lib/supabase/server";

export type FeeRow = {
  student_id: string;
  student_name: string;
  photo_url: string | null;
  class_id: string | null;
  class_name: string | null;
  due: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
};

export async function listFees(): Promise<FeeRow[]> {
  const supabase = await createClient();

  // Sums happen in Postgres (student_fee_balances view, migration 0017):
  // exact numeric math, one row per student, already scoped to the
  // current academic year.
  const { data } = await supabase
    .from("student_fee_balances")
    .select("*")
    .eq("student_status", "active")
    .order("full_name");

  return (data ?? []).map((r) => ({
    student_id: r.student_id,
    student_name: r.full_name,
    photo_url: r.photo_url,
    class_id: r.class_id,
    class_name: r.class_name,
    due: Number(r.due),
    paid: Number(r.paid),
    balance: Number(r.balance),
    status: r.fee_status,
  }));
}

export async function getFeeSummary(rows: FeeRow[]) {
  const expected = rows.reduce((sum, r) => sum + r.due, 0);
  const collected = rows.reduce((sum, r) => sum + r.paid, 0);
  const outstanding = Math.max(0, expected - collected);
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  return { expected, collected, outstanding, rate };
}
