import { createClient } from "@/lib/supabase/server";

export type DepartmentRow = {
  id: string;
  seq: number;
  name: string;
  head_teacher_id: string | null;
  head_teacher_name: string | null;
  subject_count: number;
  teacher_count: number;
  periods_per_week: number;
};

export type SubjectRow = {
  id: string;
  seq: number;
  name: string;
  department_id: string | null;
  department_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  type: "core" | "elective";
  periods_per_week: number;
  description: string | null;
};

type RawSubject = {
  id: string;
  seq: number;
  name: string;
  department_id: string | null;
  teacher_id: string | null;
  type: "core" | "elective";
  periods_per_week: number;
  description: string | null;
  departments: { name: string } | null;
  teachers: { full_name: string } | null;
};

export async function listSubjects(): Promise<SubjectRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("*, departments(name), teachers(full_name)")
    .order("seq")
    .returns<RawSubject[]>();

  return (data ?? []).map((s) => ({
    id: s.id,
    seq: s.seq,
    name: s.name,
    department_id: s.department_id,
    department_name: s.departments?.name ?? null,
    teacher_id: s.teacher_id,
    teacher_name: s.teachers?.full_name ?? null,
    type: s.type,
    periods_per_week: s.periods_per_week,
    description: s.description,
  }));
}

export async function listDepartments(): Promise<DepartmentRow[]> {
  const supabase = await createClient();

  const [{ data: departments }, { data: subjects }] = await Promise.all([
    supabase
      .from("departments")
      .select("*, teachers(full_name)")
      .order("seq")
      .returns<Array<{ id: string; seq: number; name: string; head_teacher_id: string | null; teachers: { full_name: string } | null }>>(),
    supabase.from("subjects").select("department_id, teacher_id, periods_per_week"),
  ]);

  return (departments ?? []).map((d) => {
    const deptSubjects = (subjects ?? []).filter((s) => s.department_id === d.id);
    const teacherIds = new Set(deptSubjects.map((s) => s.teacher_id).filter(Boolean));
    return {
      id: d.id,
      seq: d.seq,
      name: d.name,
      head_teacher_id: d.head_teacher_id,
      head_teacher_name: d.teachers?.full_name ?? null,
      subject_count: deptSubjects.length,
      teacher_count: teacherIds.size,
      periods_per_week: deptSubjects.reduce((sum, s) => sum + (s.periods_per_week ?? 0), 0),
    };
  });
}

export async function listDepartmentOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select("id, name").order("name");
  return data ?? [];
}
