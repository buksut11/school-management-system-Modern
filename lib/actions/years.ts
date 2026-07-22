"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
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
    return { error: friendlyError(error) };
  }

  await logActivity(supabase, "settings", `Added academic year · ${name}`);
  revalidatePath("/", "layout");
  return { success: true };
}

export async function setCurrentAcademicYear(id: string, name: string): Promise<FormState> {
  const supabase = await createClient();

  // One transaction in the database (migration 0018): flips the current
  // flag atomically, verifies the caller is an admin, and carries every
  // active student's class into the new year as their starting enrollment.
  const { data, error } = await supabase.rpc("set_current_academic_year", { p_year_id: id });
  if (error) return { error: friendlyError(error) };

  await logActivity(
    supabase,
    "settings",
    `Switched current academic year · ${name} · ${data?.enrolled ?? 0} students carried over`
  );
  revalidatePath("/", "layout");
  return { success: true };
}
