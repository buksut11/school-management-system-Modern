import { createClient } from "@/lib/supabase/server";
import type { Teacher } from "@/lib/types/database";

type TeacherJoinRow = Teacher & { classes: { name: string } | null };

export type TeacherWithClass = {
  id: string;
  seq: number;
  full_name: string;
  dob: string | null;
  gender: "male" | "female" | null;
  address: string | null;
  mobile: string | null;
  subjects: string[];
  photo_url: string | null;
  status: "active" | "inactive";
  class_id: string | null;
  class_name: string | null;
};

export async function listTeachers(): Promise<TeacherWithClass[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("*, classes(name)")
    .order("seq", { ascending: true })
    .returns<TeacherJoinRow[]>();

  return (data ?? []).map((t) => ({
    id: t.id,
    seq: t.seq,
    full_name: t.full_name,
    dob: t.dob,
    gender: t.gender,
    address: t.address,
    mobile: t.mobile,
    subjects: t.subjects ?? [],
    photo_url: t.photo_url,
    status: t.status,
    class_id: t.class_id,
    class_name: t.classes?.name ?? null,
  }));
}

export async function listTeacherOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teachers")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}
