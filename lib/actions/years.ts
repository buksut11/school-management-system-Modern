"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function addAcademicYear(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = str(formData, "name");
  if (!name) return { error: "Year name is required (e.g. 2026-2027)." };

  const supabase = await createClient();
  const { error } = await supabase.from("academic_years").insert({
    name,
    starts_on: str(formData, "starts_on"),
    ends_on: str(formData, "ends_on"),
  });
  if (error) {
    if (error.code === "23505") return { error: `A year named "${name}" already exists.` };
    return { error: error.message };
  }

  await logActivity(supabase, "settings", `Added academic year · ${name}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function setCurrentAcademicYear(id: string, name: string): Promise<FormState> {
  const supabase = await createClient();

  // Two steps because the partial unique index allows at most one current
  // year — the old flag must clear before the new one can be set. If the
  // second step fails we're briefly current-less, which the database and
  // app both tolerate (they fall back to the newest year).
  const { error: clearError } = await supabase
    .from("academic_years")
    .update({ is_current: false })
    .eq("is_current", true);
  if (clearError) return { error: clearError.message };

  // .select() so an RLS-blocked update (0 rows, no error) doesn't pass
  // as success — only admins may switch years.
  const { data, error } = await supabase
    .from("academic_years")
    .update({ is_current: true })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Only an admin account can switch the academic year." };

  await logActivity(supabase, "settings", `Switched current academic year · ${name}`);
  revalidatePath("/", "layout");
  return { success: true };
}
