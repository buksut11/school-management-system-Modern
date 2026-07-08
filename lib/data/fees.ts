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

  const [{ data: students }, { data: payments }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, photo_url, class_id, base_fees, classes(name)")
      .eq("status", "active")
      .returns<
        Array<{
          id: string;
          full_name: string;
          photo_url: string | null;
          class_id: string | null;
          base_fees: number;
          classes: { name: string } | null;
        }>
      >(),
    supabase.from("fee_payments").select("student_id, amount"),
  ]);

  const paidByStudent = new Map<string, number>();
  (payments ?? []).forEach((p) => {
    paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) ?? 0) + Number(p.amount));
  });

  return (students ?? []).map((s) => {
    const due = Number(s.base_fees);
    const paid = paidByStudent.get(s.id) ?? 0;
    const balance = Math.max(0, due - paid);
    const status: FeeRow["status"] = balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
    return {
      student_id: s.id,
      student_name: s.full_name,
      photo_url: s.photo_url,
      class_id: s.class_id,
      class_name: s.classes?.name ?? null,
      due,
      paid,
      balance,
      status,
    };
  });
}

export async function getFeeSummary(rows: FeeRow[]) {
  const expected = rows.reduce((sum, r) => sum + r.due, 0);
  const collected = rows.reduce((sum, r) => sum + r.paid, 0);
  const outstanding = Math.max(0, expected - collected);
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  return { expected, collected, outstanding, rate };
}
