"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";

// Platform-owner actions: schools are provisioned manually, never by
// signups. Both RPCs verify is_platform_admin in the database.

export async function platformCreateSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get("name");
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return { error: "Enter the school's name." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_school", { p_name: trimmed });
  if (error) return { error: error.message };

  await logActivity(supabase, "settings", `School registered · ${trimmed}`);
  revalidatePath("/", "layout");
  return { success: true };
}

// Fetch (or mint) the school's single-use admin invite. Only works while
// the school has no admin — after that, its admin issues the invites.
export async function platformAdminInvite(
  schoolId: string
): Promise<{ error?: string; code?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_admin_invite", { p_school_id: schoolId });
  if (error) return { error: error.message };
  return { code: data ?? undefined };
}

export async function platformDeleteSchool(
  schoolId: string,
  schoolName: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_delete_school", { p_school_id: schoolId });
  if (error) return { error: error.message };

  await logActivity(supabase, "settings", `School removed from platform · ${schoolName}`);
  revalidatePath("/", "layout");
  return {};
}
