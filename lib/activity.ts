import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  kind: string,
  message: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let actorName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    actorName = profile?.full_name || user.email || null;
  }

  await supabase.from("activity_log").insert({
    kind,
    message,
    actor_id: user?.id ?? null,
    actor_name: actorName,
  });
}
