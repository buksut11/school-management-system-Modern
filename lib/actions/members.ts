"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { logActivity } from "@/lib/activity";
import type { AssignableRole } from "@/lib/types/database";

export type MemberActionResult = { error?: string; code?: string };

export async function createInvite(input: {
  role: Exclude<AssignableRole, "admin">;
  email?: string | null;
  teacherId?: string | null;
  studentIds?: string[];
}): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite", {
    p_role: input.role,
    p_email: input.email ?? null,
    p_teacher_id: input.teacherId ?? null,
    p_student_ids: input.studentIds ?? [],
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Invite created · ${input.role}`);
  revalidatePath("/settings");
  return { code: data?.code };
}

export async function revokeInvite(id: string): Promise<MemberActionResult> {
  const supabase = await createClient();
  // .select() so an RLS-blocked delete (0 rows, no error) doesn't pass
  // as success.
  const { data, error } = await supabase.from("invites").delete().eq("id", id).select("id");
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: "Only an admin account can revoke invites." };

  await logActivity(supabase, "settings", "Invite revoked");
  revalidatePath("/settings");
  return {};
}

export async function setMemberRole(
  userId: string,
  role: AssignableRole,
  memberName: string
): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", { p_user_id: userId, p_role: role });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Member role changed · ${memberName} → ${role}`);
  revalidatePath("/", "layout");
  return {};
}

export async function linkMemberTeacher(
  userId: string,
  teacherId: string | null,
  memberName: string
): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_member_teacher", {
    p_user_id: userId,
    p_teacher_id: teacherId,
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Teacher record linked · ${memberName}`);
  revalidatePath("/", "layout");
  return {};
}

export async function linkMemberStudents(
  userId: string,
  studentIds: string[],
  memberName: string
): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_member_students", {
    p_user_id: userId,
    p_student_ids: studentIds,
  });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Student records linked · ${memberName}`);
  revalidatePath("/", "layout");
  return {};
}

export async function removeMember(userId: string, memberName: string): Promise<MemberActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "settings", `Member removed · ${memberName}`);
  revalidatePath("/", "layout");
  return {};
}
