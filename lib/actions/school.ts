"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import type { FormState } from "@/lib/actions/students";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function joinSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = str(formData, "code");
  if (!code) return { error: (await getT())("err.enterJoinCode") };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_school", { p_code: code });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Staff member joined · ${data?.name ?? "school"}`);
  revalidatePath("/", "layout");
  return { success: true };
}

// Invite-link variant of joinSchool: called with the code from /join/[code]
// rather than a form field.
export async function joinSchoolWithCode(code: string): Promise<{ error?: string; name?: string }> {
  if (!code?.trim()) return { error: (await getT())("err.inviteMissingCode") };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_school", { p_code: code.trim() });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Staff member joined via invite link · ${data?.name ?? "school"}`);
  revalidatePath("/", "layout");
  return { name: data?.name };
}

export async function renameSchool(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id || !name) return { error: (await getT())("err.schoolNameRequired") };

  const supabase = await createClient();
  // .select() so an RLS-blocked update (0 rows, no error) doesn't pass
  // as success — only admins of this school may rename it.
  const { data, error } = await supabase.from("schools").update({ name }).eq("id", id).select("id");
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: (await getT())("err.onlyAdminRename") };

  await logActivity(supabase, "settings", `School renamed · ${name}`);
  revalidatePath("/", "layout");
  return { success: true };
}
