import { createClient } from "@/lib/supabase/server";
import type { AcademicYear } from "@/lib/types/database";

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("*")
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Mirrors current_academic_year_id() in the database: the year flagged
// current, else the newest, so both sides always agree on "this year".
export function pickCurrentYear(years: AcademicYear[]): AcademicYear | null {
  return years.find((y) => y.is_current) ?? years[0] ?? null;
}

export async function getCurrentYearId(): Promise<string | null> {
  const years = await listAcademicYears();
  return pickCurrentYear(years)?.id ?? null;
}
