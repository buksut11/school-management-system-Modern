"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export type MemberActionResult = { error?: string; joinCode?: string };

export async function rotateJoinCode(): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_join_code");
  if (error) return { error: error.message };

  await logActivity(supabase, "settings", "Invite link rotated — old links no longer work");
  revalidatePath("/", "layout");
  return { joinCode: data ?? undefined };
}

export async function setMemberRole(
  userId: string,
  role: "admin" | "staff",
  memberName: string
): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", { p_user_id: userId, p_role: role });
  if (error) return { error: error.message };

  await logActivity(supabase, "settings", `Member role changed · ${memberName} → ${role}`);
  revalidatePath("/", "layout");
  return {};
}

export async function removeMember(userId: string, memberName: string): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
  if (error) return { error: error.message };

  await logActivity(supabase, "settings", `Member removed · ${memberName}`);
  revalidatePath("/", "layout");
  return {};
}
