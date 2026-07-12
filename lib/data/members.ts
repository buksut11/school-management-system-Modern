import { createClient } from "@/lib/supabase/server";

export type Member = {
  id: string;
  full_name: string;
  role: "admin" | "staff";
  created_at: string;
};

// Same-school profiles are readable under RLS, so no filter is needed —
// but a user's own row is visible even before they join a school, so
// exclude school-less rows explicitly.
export async function listMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at, school_id")
    .not("school_id", "is", null)
    .order("created_at");
  return (data ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role,
    created_at: m.created_at,
  }));
}
