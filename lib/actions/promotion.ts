"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { logActivity } from "@/lib/activity";
import { getPromotionPlan, type PromotionPlan } from "@/lib/data/promotion";
import type { FormState } from "@/lib/actions/students";

// Client-callable snapshot for the promotion screen.
export async function loadPromotionPlan(): Promise<PromotionPlan> {
  return getPromotionPlan();
}

// Advance active students to their class's next class and graduate those
// in a final class, skipping any held back (repeaters). Admin only,
// enforced in the database by promote_students().
export async function promoteStudents(
  holdIds: string[]
): Promise<FormState & { promoted?: number; graduated?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("promote_students", { p_hold_ids: holdIds });
  if (error) return { error: friendlyError(error) };

  const promoted = Number(data?.promoted ?? 0);
  const graduated = Number(data?.graduated ?? 0);
  await logActivity(
    supabase,
    "student",
    `Promotion run · ${promoted} advanced, ${graduated} graduated`
  );
  revalidatePath("/", "layout");
  return { success: true, promoted, graduated };
}
