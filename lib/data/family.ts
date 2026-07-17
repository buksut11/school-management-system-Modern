import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/data/photos";
import type { Term } from "@/lib/types/database";

export type FamilyChild = {
  student_id: string;
  full_name: string;
  photo_url: string | null;
  class_name: string | null;
  // fees (current academic year)
  due: number;
  paid: number;
  balance: number;
  fee_status: "paid" | "partial" | "unpaid";
  // attendance, last 30 days
  present: number;
  late: number;
  absent: number;
  // exams, current year
  latest_term: Term | null;
  latest_total: number | null;
  latest_grade: string | null;
};

// Everything here relies on RLS: a student/parent account only ever gets
// their linked child rows back, so the queries are written as plain
// selects with no explicit filtering by child.
export async function getFamilyChildren(): Promise<FamilyChild[]> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: balances }, { data: attendance }, { data: exams }] = await Promise.all([
    supabase.from("student_fee_balances").select("*").order("full_name"),
    supabase.from("attendance").select("student_id, status").gte("date", sinceStr),
    supabase
      .from("exams")
      .select("student_id, term, total_score, grade, exam_date")
      .order("exam_date", { ascending: false }),
  ]);

  const att = new Map<string, { present: number; late: number; absent: number }>();
  for (const a of attendance ?? []) {
    const bucket = att.get(a.student_id) ?? { present: 0, late: 0, absent: 0 };
    bucket[a.status as "present" | "late" | "absent"]++;
    att.set(a.student_id, bucket);
  }

  const latestExam = new Map<string, { term: Term; total: number; grade: string }>();
  for (const e of exams ?? []) {
    if (!latestExam.has(e.student_id)) {
      latestExam.set(e.student_id, {
        term: e.term as Term,
        total: Number(e.total_score),
        grade: e.grade,
      });
    }
  }

  return signPhotoUrls((balances ?? []).map((b) => {
    const a = att.get(b.student_id) ?? { present: 0, late: 0, absent: 0 };
    const e = latestExam.get(b.student_id) ?? null;
    return {
      student_id: b.student_id,
      full_name: b.full_name,
      photo_url: b.photo_url,
      class_name: b.class_name,
      due: Number(b.due),
      paid: Number(b.paid),
      balance: Number(b.balance),
      fee_status: b.fee_status,
      present: a.present,
      late: a.late,
      absent: a.absent,
      latest_term: e?.term ?? null,
      latest_total: e?.total ?? null,
      latest_grade: e?.grade ?? null,
    };
  }));
}
