import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types/database";

export type Member = {
  id: string;
  full_name: string;
  role: Role;
  teacher_id: string | null;
  student_ids: string[];
  created_at: string;
};

// Same-school profiles are readable under RLS for staff roles; a user's
// own row is visible even before they join a school, so exclude
// school-less rows explicitly. Family/teacher record links come from
// profile_students and profiles.teacher_id.
export type PersonOption = { id: string; full_name: string };

// Light pickers for the Members panel's record-linking controls.
export async function listStudentOptions(): Promise<PersonOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("id, full_name").order("full_name");
  return data ?? [];
}

export async function listTeacherOptions(): Promise<PersonOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teachers").select("id, full_name").order("full_name");
  return data ?? [];
}

export async function listMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: links }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, teacher_id, created_at, school_id")
      .not("school_id", "is", null)
      .order("created_at"),
    supabase.from("profile_students").select("profile_id, student_id"),
  ]);

  const linksByProfile = new Map<string, string[]>();
  (links ?? []).forEach((l) => {
    linksByProfile.set(l.profile_id, [...(linksByProfile.get(l.profile_id) ?? []), l.student_id]);
  });

  return (profiles ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role,
    teacher_id: m.teacher_id,
    student_ids: linksByProfile.get(m.id) ?? [],
    created_at: m.created_at,
  }));
}
