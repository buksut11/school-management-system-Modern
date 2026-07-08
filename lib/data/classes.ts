import { createClient } from "@/lib/supabase/server";

export type ClassWithStats = {
  id: string;
  seq: number;
  name: string;
  room: string | null;
  base_fees: number;
  capacity: number;
  teacher_id: string | null;
  teacher_name: string | null;
  enrolled: number;
  boys: number;
  girls: number;
};

export async function listClasses(): Promise<ClassWithStats[]> {
  const supabase = await createClient();

  const [{ data: classes }, { data: students }] = await Promise.all([
    supabase
      .from("classes")
      .select("*, teachers(full_name)")
      .order("name")
      .returns<Array<{ id: string; seq: number; name: string; room: string | null; base_fees: number; capacity: number; teacher_id: string | null; teachers: { full_name: string } | null }>>(),
    supabase.from("students").select("class_id, gender").eq("status", "active"),
  ]);

  return (classes ?? []).map((c) => {
    const roster = (students ?? []).filter((s) => s.class_id === c.id);
    return {
      id: c.id,
      seq: c.seq,
      name: c.name,
      room: c.room,
      base_fees: Number(c.base_fees),
      capacity: c.capacity,
      teacher_id: c.teacher_id,
      teacher_name: c.teachers?.full_name ?? null,
      enrolled: roster.length,
      boys: roster.filter((s) => s.gender === "male").length,
      girls: roster.filter((s) => s.gender === "female").length,
    };
  });
}
