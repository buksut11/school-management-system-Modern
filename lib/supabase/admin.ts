import { createClient as createBareClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Service-role client — BYPASSES RLS entirely. Import only from trusted
// server contexts (today: the cron delivery endpoint, which sends every
// school's pending messages). Never reachable from the browser: the key
// is a non-public env var and this module has no client-side importers.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createBareClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
