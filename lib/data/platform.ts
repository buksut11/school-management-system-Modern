import { createClient } from "@/lib/supabase/server";

export type PlatformSchool = {
  id: string;
  name: string;
  created_at: string;
  members: number;
  students: number;
  has_admin: boolean;
};

export async function getIsPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();
  return Boolean(data?.is_platform_admin);
}

export async function listPlatformSchools(): Promise<PlatformSchool[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_list_schools");
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    created_at: s.created_at,
    members: Number(s.members),
    students: Number(s.students),
    has_admin: Boolean(s.has_admin),
  }));
}
