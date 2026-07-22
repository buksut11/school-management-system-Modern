"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { logActivity } from "@/lib/activity";
import { deliverPending } from "@/lib/sms/deliver";

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
  if (error) return { error: friendlyError(error) };

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
  if (error) return { error: friendlyError(error) };

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

export type SendNowResult = {
  error?: string;
  sent?: number;
  failed?: number;
  remaining?: number;
};

export async function sendPendingNow(): Promise<SendNowResult> {
  const supabase = await createClient();
  // Runs under the signed-in user's own permissions: RLS scopes the
  // pending rows to their school, and only desk roles can update
  // statuses — so the button simply doesn't work for anyone else.
  const result = await deliverPending(supabase, 50);
  if (result.error) return { error: result.error };

  if (result.sent || result.failed) {
    await logActivity(
      supabase,
      "message",
      `Sent ${result.sent} message${result.sent === 1 ? "" : "s"} via SMS gateway` +
        (result.failed ? ` · ${result.failed} failed` : "")
    );
  }
  revalidatePath("/messages");
  return { sent: result.sent, failed: result.failed, remaining: result.remaining };
}

export async function retryFailedNotifications(): Promise<{ error?: string; retried?: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ status: "pending", error: null })
    .eq("status", "failed")
    .select("id");
  if (error) return { error: friendlyError(error) };

  revalidatePath("/messages");
  return { retried: data?.length ?? 0 };
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
  if (error) return { error: friendlyError(error) };

  await logActivity(supabase, "message", `Marked ${data?.length ?? 0} messages as sent`);
  revalidatePath("/messages");
  return { marked: data?.length ?? 0 };
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/messages");
  return {};
}
