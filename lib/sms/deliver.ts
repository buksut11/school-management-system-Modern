import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getGateway } from "@/lib/sms/gateway";
import { normalizePhone } from "@/lib/sms/phone";

export type DeliveryResult = {
  error?: string;
  sent: number;
  failed: number;
  remaining: number;
};

// Delivers pending outbox rows through the configured gateway and
// records each outcome on the row (sent/sent_at, or failed/error).
//
// Works with EITHER client: a signed-in desk user's (RLS scopes it to
// their school — the Send button) or the service-role client (all
// schools — the cron endpoint). Batches are capped so a serverless
// invocation finishes comfortably; `remaining` tells the caller to go
// again.
export async function deliverPending(
  supabase: SupabaseClient<Database>,
  limit = 50
): Promise<DeliveryResult> {
  const gateway = getGateway();
  if (!gateway) {
    return { error: "No SMS gateway is configured.", sent: 0, failed: 0, remaining: 0 };
  }

  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id, recipient, body")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);
  if (error) return { error: error.message, sent: 0, failed: 0, remaining: 0 };

  let sent = 0;
  let failed = 0;
  for (const n of pending ?? []) {
    const to = normalizePhone(n.recipient);
    const result = to
      ? await gateway.send(to, n.body)
      : { ok: false as const, error: `"${n.recipient}" is not a valid phone number.` };

    const { error: updateError } = await supabase
      .from("notifications")
      .update(
        result.ok
          ? { status: "sent", sent_at: new Date().toISOString(), error: null }
          : { status: "failed", error: (result.error ?? "Send failed").slice(0, 300) }
      )
      .eq("id", n.id)
      .eq("status", "pending");
    // A row we couldn't mark counts as failed for reporting — but never
    // retry-send it in this pass (double SMS is worse than a stale row).
    if (result.ok && !updateError) sent += 1;
    else failed += 1;
  }

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return { sent, failed, remaining: count ?? 0 };
}
