import { createClient } from "@/lib/supabase/server";
import type { School } from "@/lib/types/database";

// The caller's school — RLS only ever exposes their own, so no filter
// is needed. Null while the signed-in user hasn't created/joined one.
export async function getSchool(): Promise<School | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("*").maybeSingle();
  return data ?? null;
}
