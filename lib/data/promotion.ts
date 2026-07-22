import { createClient } from "@/lib/supabase/server";
import { listAcademicYears, pickCurrentYear } from "@/lib/data/years";

export type PromotionClass = {
  id: string;
  name: string;
  next_class_id: string | null;
  next_class_name: string | null;
  students: { id: string; full_name: string }[];
};

export type PromotionPlan = {
  classes: PromotionClass[];
  currentYear: string | null;
};

// Everything the promotion screen needs: each class, the class it promotes
// into (or null = graduate), and its active students. Students with no
// class can't be promoted, so they're left out.
export async function getPromotionPlan(): Promise<PromotionPlan> {
  const supabase = await createClient();

  const [{ data: classes }, { data: students }, years] = await Promise.all([
    supabase.from("classes").select("id, name, next_class_id").order("name"),
    supabase
      .from("students")
      .select("id, full_name, class_id")
      .eq("status", "active")
      .not("class_id", "is", null)
      .order("full_name"),
    listAcademicYears(),
  ]);
  const currentYear = pickCurrentYear(years)?.name ?? null;

  const nameById = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const byClass = new Map<string, { id: string; full_name: string }[]>();
  for (const s of students ?? []) {
    if (!s.class_id) continue;
    const list = byClass.get(s.class_id) ?? [];
    list.push({ id: s.id, full_name: s.full_name });
    byClass.set(s.class_id, list);
  }

  return {
    currentYear,
    classes: (classes ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      next_class_id: c.next_class_id,
      next_class_name: c.next_class_id ? nameById.get(c.next_class_id) ?? null : null,
      students: byClass.get(c.id) ?? [],
    })),
  };
}
