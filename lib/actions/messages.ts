"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export type QueueResult = {
  error?: string;
  queued?: number;
  no_phone?: number;
  already?: number;
};

export async function queueFeeReminders(template: string | null): Promise<QueueResult> {
  const supabase = await createClient();
  // Renders and queues one message per active student with a balance and
  // a parent number (migration 0040); students with a reminder already
  // pending are skipped so parents aren't spammed.
  const { data, error } = await supabase.rpc("queue_fee_reminders", {
    p_template: template,
  });
  if (error) return { error: error.message };

  if (data?.queued) {
    await logActivity(supabase, "message", `Queued ${data.queued} fee reminder${data.queued === 1 ? "" : "s"}`);
  }
  revalidatePath("/messages");
  return {
    queued: data?.queued ?? 0,
    no_phone: data?.no_phone ?? 0,
    already: data?.already_pending ?? 0,
  };
}

export async function queueAbsenceAlerts(
  date: string,
  template: string | null
): Promise<QueueResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("queue_absence_alerts", {
    p_date: date,
    p_template: template,
  });
  if (error) return { error: error.message };

  if (data?.queued) {
    await logActivity(supabase, "message", `Queued ${data.queued} absence alert${data.queued === 1 ? "" : "s"}`);
  }
  revalidatePath("/messages");
  return {
    queued: data?.queued ?? 0,
    no_phone: data?.no_phone ?? 0,
    already: data?.already_sent ?? 0,
  };
}

export async function markNotificationsSent(ids: string[]): Promise<{ error?: string; marked?: number }> {
  if (!ids?.length) return { marked: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");
  if (error) return { error: error.message };

  await logActivity(supabase, "message", `Marked ${data?.length ?? 0} messages as sent`);
  revalidatePath("/messages");
  return { marked: data?.length ?? 0 };
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/messages");
  return {};
}
