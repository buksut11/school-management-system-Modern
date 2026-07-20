import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "@/lib/sms/gateway";
import { deliverPending } from "@/lib/sms/deliver";

// Automated outbox delivery, for a scheduler rather than a person:
// Vercel Cron, GitHub Actions on a schedule, or any pinger that can
// send a header. Delivers EVERY school's pending messages via the
// service role, so it's locked behind CRON_SECRET:
//
//   GET /api/notifications/send
//   Authorization: Bearer <CRON_SECRET>
//
// (Vercel Cron attaches exactly that header automatically when a
// CRON_SECRET env var exists.) The desk-facing alternative — the Send
// button on /messages — needs none of this: it runs under the signed-in
// user's own permissions.

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Set CRON_SECRET to enable scheduled delivery." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!getGateway()) {
    return NextResponse.json({ error: "No SMS gateway is configured." }, { status: 503 });
  }
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Set SUPABASE_SERVICE_ROLE_KEY to enable scheduled delivery." },
      { status: 503 }
    );
  }

  const result = await deliverPending(supabase, 50);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
