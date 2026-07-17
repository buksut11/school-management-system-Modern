import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/data/photos";

export type FeeRow = {
  student_id: string;
  student_name: string;
  photo_url: string | null;
  class_id: string | null;
  class_name: string | null;
  // due is the year's NET fee (gross - discount) — what balances run against.
  due: number;
  paid: number;
  balance: number;
  status: "paid" | "partial" | "unpaid";
  gross: number;
  discount: number;
  discount_reason: string | null;
  // Installment schedule (0038): what should be paid by today, how far
  // behind the student is, and the next upcoming installment.
  expected: number;
  overdue: number;
  next_due_date: string | null;
  next_due_label: string | null;
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

  return signPhotoUrls(
    (data ?? []).map((r) => ({
      student_id: r.student_id,
      student_name: r.full_name,
      photo_url: r.photo_url,
      class_id: r.class_id,
      class_name: r.class_name,
      due: Number(r.due),
      paid: Number(r.paid),
      balance: Number(r.balance),
      status: r.fee_status,
      gross: Number(r.gross),
      discount: Number(r.discount),
      discount_reason: r.discount_reason,
      expected: Number(r.expected),
      overdue: Number(r.overdue),
      next_due_date: r.next_due_date,
      next_due_label: r.next_due_label,
    }))
  );
}

export type FeeInstallment = {
  id: string;
  name: string;
  due_date: string;
  percent: number;
};

// The current year's payment schedule, for the fees page header and the
// schedule editor.
export async function getFeeSchedule(): Promise<{
  year: { id: string; name: string } | null;
  installments: FeeInstallment[];
}> {
  const supabase = await createClient();
  const { data: year } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("is_current", true)
    .maybeSingle();
  if (!year) return { year: null, installments: [] };

  const { data } = await supabase
    .from("fee_installments")
    .select("id, name, due_date, percent")
    .eq("year_id", year.id)
    .order("due_date");
  return {
    year,
    installments: (data ?? []).map((i) => ({ ...i, percent: Number(i.percent) })),
  };
}

export async function getFeeSummary(rows: FeeRow[]) {
  const expected = rows.reduce((sum, r) => sum + r.due, 0);
  const collected = rows.reduce((sum, r) => sum + r.paid, 0);
  const outstanding = Math.max(0, expected - collected);
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  return { expected, collected, outstanding, rate };
}
