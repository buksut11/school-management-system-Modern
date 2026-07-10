import { createClient } from "@/lib/supabase/server";

export async function getTableCounts() {
  const supabase = await createClient();
  const tables = [
    "students",
    "teachers",
    "classes",
    "attendance",
    "exams",
    "subjects",
    "departments",
    "fee_payments",
    "expenses",
    "invoices",
    "receipts",
  ] as const;

  const results = await Promise.all(
    tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true }))
  );

  return Object.fromEntries(tables.map((t, i) => [t, results[i].count ?? 0])) as Record<
    (typeof tables)[number],
    number
  >;
}
