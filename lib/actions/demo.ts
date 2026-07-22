"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { logActivity } from "@/lib/activity";
import type { Gender, PaymentMethod, AttendanceStatus, ExpenseCategory } from "@/lib/types/database";

// Seeded for schools that don't have a subject list yet (the gradebook
// is the subjects table since migration 0035).
const DEFAULT_SUBJECTS = [
  "Somali",
  "English",
  "Chemistry",
  "Physics",
  "Maths",
  "Arabic",
  "Geography",
];

const DEMO_TEACHERS: {
  full_name: string;
  gender: Gender;
  dob: string;
  mobile: string;
  address: string;
  subjects: string[];
}[] = [
  { full_name: "Axmed Cali Xasan", gender: "male", dob: "1985-03-12", mobile: "0615551201", address: "Wadajir, Mogadishu", subjects: ["Maths", "Physics"] },
  { full_name: "Faadumo Maxamed Nuur", gender: "female", dob: "1990-07-24", mobile: "0615551202", address: "Hodan, Mogadishu", subjects: ["English", "Somali"] },
  { full_name: "Cabdullahi Yusuf Warsame", gender: "male", dob: "1982-11-05", mobile: "0615551203", address: "Hamar Weyne, Mogadishu", subjects: ["Chemistry"] },
  { full_name: "Khadiija Ibraahim Cumar", gender: "female", dob: "1988-01-30", mobile: "0615551204", address: "Waberi, Mogadishu", subjects: ["Arabic"] },
  { full_name: "Maxamuud Siciid Jaamac", gender: "male", dob: "1979-09-17", mobile: "0615551205", address: "Karan, Mogadishu", subjects: ["Geography"] },
  { full_name: "Hodan Cabdi Faarax", gender: "female", dob: "1992-05-02", mobile: "0615551206", address: "Shibis, Mogadishu", subjects: ["Somali", "Arabic"] },
];

// four students per seeded class (Form 1C, 2A, 3B, 4A)
const DEMO_STUDENTS: {
  full_name: string;
  gender: Gender;
  dob: string;
  className: string;
}[] = [
  { full_name: "Liibaan Axmed Maxamed", gender: "male", dob: "2012-04-15", className: "Form 1C" },
  { full_name: "Nasteexo Cali Yusuf", gender: "female", dob: "2012-08-03", className: "Form 1C" },
  { full_name: "Yaxye Cabdiraxmaan Nuur", gender: "male", dob: "2011-12-21", className: "Form 1C" },
  { full_name: "Sagal Maxamuud Cismaan", gender: "female", dob: "2012-02-09", className: "Form 1C" },
  { full_name: "Mustafe Xuseen Cabdi", gender: "male", dob: "2011-06-27", className: "Form 2A" },
  { full_name: "Hamdi Ibraahim Siciid", gender: "female", dob: "2011-10-14", className: "Form 2A" },
  { full_name: "Cumar Faarax Jaamac", gender: "male", dob: "2010-03-08", className: "Form 2A" },
  { full_name: "Ruun Cabdullahi Xasan", gender: "female", dob: "2011-01-19", className: "Form 2A" },
  { full_name: "Zakariye Maxamed Warsame", gender: "male", dob: "2010-07-30", className: "Form 3B" },
  { full_name: "Ilhaan Yusuf Cali", gender: "female", dob: "2009-11-11", className: "Form 3B" },
  { full_name: "Bashiir Siciid Cumar", gender: "male", dob: "2010-05-25", className: "Form 3B" },
  { full_name: "Nimco Axmed Faarax", gender: "female", dob: "2009-09-06", className: "Form 3B" },
  { full_name: "Xamse Cabdi Maxamuud", gender: "male", dob: "2009-02-17", className: "Form 4A" },
  { full_name: "Deeqa Nuur Ibraahim", gender: "female", dob: "2008-12-01", className: "Form 4A" },
  { full_name: "Saleebaan Cali Xuseen", gender: "male", dob: "2008-06-13", className: "Form 4A" },
  { full_name: "Ubax Warsame Yusuf", gender: "female", dob: "2009-04-22", className: "Form 4A" },
];

const DEMO_EXPENSES: {
  payee: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paid: number;
  daysAgo: number;
  method: PaymentMethod;
}[] = [
  { payee: "Teaching staff payroll", category: "salaries", description: "Monthly teacher salaries", amount: 2400, paid: 2400, daysAgo: 6, method: "bank_transfer" },
  { payee: "Xasan Properties", category: "rent", description: "School building rent", amount: 800, paid: 800, daysAgo: 12, method: "bank_transfer" },
  { payee: "Mogadishu Power Co.", category: "utilities", description: "Electricity bill", amount: 150, paid: 100, daysAgo: 4, method: "mobile_money" },
  { payee: "Saafi Water Services", category: "utilities", description: "Water delivery", amount: 60, paid: 60, daysAgo: 9, method: "cash" },
  { payee: "Daryeel Stationery", category: "supplies", description: "Chalk, exercise books and markers", amount: 220, paid: 120, daysAgo: 3, method: "cash" },
  { payee: "Nujuum Furniture", category: "maintenance", description: "Desk and chair repairs", amount: 180, paid: 0, daysAgo: 2, method: "other" },
  { payee: "Geeddi Bus Service", category: "transport", description: "Student transport contract", amount: 350, paid: 350, daysAgo: 15, method: "mobile_money" },
  { payee: "Caafi Cleaning", category: "maintenance", description: "Compound cleaning service", amount: 90, paid: 45, daysAgo: 1, method: "cash" },
];

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "mobile_money", "bank_transfer"];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function seedDemoData(): Promise<{ error: string } | { success: true; summary: string }> {
  const supabase = await createClient();

  const { count: studentCount, error: countError } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true });
  if (countError) return { error: countError.message };
  if ((studentCount ?? 0) > 0) {
    return { error: (await getT())("err.demoOnlyEmpty") };
  }

  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, name, base_fees")
    .order("name");
  if (classError) return { error: classError.message };
  if (!classes || classes.length === 0) {
    return { error: (await getT())("err.noClassesMigrate") };
  }
  const classByName = new Map(classes.map((c) => [c.name, c]));

  // ---- teachers ----
  const { data: teachers, error: teacherError } = await supabase
    .from("teachers")
    .insert(DEMO_TEACHERS)
    .select("id, full_name, subjects");
  if (teacherError) return { error: teacherError.message };

  // ---- class teachers (one per seeded class, round-robin) ----
  for (let i = 0; i < classes.length; i++) {
    const teacher = teachers[i % teachers.length];
    const { error } = await supabase.from("classes").update({ teacher_id: teacher.id }).eq("id", classes[i].id);
    if (error) return { error: error.message };
  }

  // ---- gradebook subjects (seed defaults if the school has none) ----
  let { data: gradebook } = await supabase.from("subjects").select("id, name").order("seq");
  if (!gradebook || gradebook.length === 0) {
    const { data: seeded, error: subjectSeedError } = await supabase
      .from("subjects")
      .insert(DEFAULT_SUBJECTS.map((name) => ({ name })))
      .select("id, name");
    if (subjectSeedError) return { error: subjectSeedError.message };
    gradebook = seeded ?? [];
  }

  // ---- which subjects each teacher teaches (teacher_subjects, 0036) ----
  const subjectIdByName = new Map(gradebook.map((s) => [s.name, s.id]));
  for (const teacher of teachers) {
    const subjectIds = teacher.subjects
      .map((name) => subjectIdByName.get(name))
      .filter((id): id is string => Boolean(id));
    if (subjectIds.length === 0) continue;
    const { error } = await supabase.rpc("set_teacher_subjects", {
      p_teacher_id: teacher.id,
      p_subject_ids: subjectIds,
    });
    if (error) return { error: error.message };
  }

  // ---- subject "owner" (subjects.teacher_id) assignments ----
  const { data: subjects } = await supabase.from("subjects").select("id, name").is("teacher_id", null);
  for (const subject of subjects ?? []) {
    const teacher = teachers.find((t) => t.subjects.includes(subject.name));
    if (!teacher) continue;
    const { error } = await supabase.from("subjects").update({ teacher_id: teacher.id }).eq("id", subject.id);
    if (error) return { error: error.message };
  }

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .is("head_teacher_id", null);
  for (let i = 0; i < (departments?.length ?? 0); i++) {
    const teacher = teachers[i % teachers.length];
    const { error } = await supabase
      .from("departments")
      .update({ head_teacher_id: teacher.id })
      .eq("id", departments![i].id);
    if (error) return { error: error.message };
  }

  // ---- timetable (period grid + a clash-free weekly rotation) ----
  const { data: slots, error: slotError } = await supabase
    .from("timetable_slots")
    .insert([
      { name: "Period 1", starts_at: "07:30", ends_at: "08:15" },
      { name: "Period 2", starts_at: "08:20", ends_at: "09:05" },
      { name: "Period 3", starts_at: "09:25", ends_at: "10:10" },
      { name: "Period 4", starts_at: "10:15", ends_at: "11:00" },
    ])
    .select("id");
  if (slotError) return { error: slotError.message };

  const teacherBySubject = new Map<string, string>();
  for (const s of gradebook) {
    const teacher = teachers.find((t) => t.subjects.includes(s.name));
    if (teacher) teacherBySubject.set(s.id, teacher.id);
  }
  const SCHOOL_DAYS = [5, 6, 0, 1, 2, 3]; // Sat–Thu week
  const busy = new Set<string>();
  const lessonRows = [];
  for (let ci = 0; ci < classes.length; ci++) {
    for (let di = 0; di < SCHOOL_DAYS.length; di++) {
      for (let si = 0; si < (slots ?? []).length; si++) {
        const subject = gradebook[(ci + di + si) % gradebook.length];
        const slotId = slots![si].id;
        const day = SCHOOL_DAYS[di];
        // never double-book a teacher: leave the cell unassigned instead
        let teacherId = teacherBySubject.get(subject.id) ?? null;
        if (teacherId && busy.has(`${teacherId}:${day}:${slotId}`)) teacherId = null;
        if (teacherId) busy.add(`${teacherId}:${day}:${slotId}`);
        lessonRows.push({
          class_id: classes[ci].id,
          slot_id: slotId,
          day,
          subject_id: subject.id,
          teacher_id: teacherId,
        });
      }
    }
  }
  const { error: lessonError } = await supabase.from("lessons").insert(lessonRows);
  if (lessonError) return { error: lessonError.message };

  // ---- students ----
  const fallbackClass = classes[0];
  const studentRecords = DEMO_STUDENTS.map((s, i) => {
    const cls = classByName.get(s.className) ?? fallbackClass;
    return {
      full_name: s.full_name,
      gender: s.gender,
      dob: s.dob,
      address: "Mogadishu",
      mobile: `061666${String(1300 + i)}`,
      parent_mobile: `061777${String(1300 + i)}`,
      class_id: cls.id,
      base_fees: Number(cls.base_fees) || 120,
    };
  });
  const { data: students, error: studentError } = await supabase
    .from("students")
    .insert(studentRecords)
    .select("id, class_id, base_fees");
  if (studentError) return { error: studentError.message };

  // ---- attendance (today + previous 4 days, mostly present) ----
  const STATUS_CYCLE: AttendanceStatus[] = [
    "present", "present", "present", "late", "present",
    "present", "absent", "present", "present", "late",
  ];
  const attendanceRecords = [];
  for (let day = 0; day < 5; day++) {
    const date = isoDaysAgo(day);
    for (let i = 0; i < students.length; i++) {
      attendanceRecords.push({
        student_id: students[i].id,
        class_id: students[i].class_id,
        date,
        status: STATUS_CYCLE[(i + day * 3) % STATUS_CYCLE.length],
      });
    }
  }
  const { error: attendanceError } = await supabase.from("attendance").insert(attendanceRecords);
  if (attendanceError) return { error: attendanceError.message };

  // ---- exams (Term 1 for every student, via the same atomic RPC the
  // exam form uses — totals and grades are computed in the database) ----
  for (let i = 0; i < students.length; i++) {
    const scores: Record<string, number> = {};
    gradebook.forEach((subject, j) => {
      scores[subject.id] = 55 + ((i * 7 + j * 11) % 43); // 55–97
    });
    const { error: examError } = await supabase.rpc("save_exam", {
      p_student_id: students[i].id,
      p_term: "Term 1",
      p_scores: scores,
      p_class_id: students[i].class_id,
      p_exam_date: isoDaysAgo(10),
      p_attendance_pct: 85 + (i % 15),
      p_test_score: 60 + ((i * 13) % 38), // 60–97
    });
    if (examError) return { error: examError.message };
  }

  // ---- fee payments (a mix of fully paid, partially paid, and unpaid) ----
  const feeRecords = [];
  for (let i = 0; i < students.length; i++) {
    const fees = Number(students[i].base_fees) || 120;
    if (i % 4 === 3) continue; // every 4th student hasn't paid yet
    const amount = i % 4 === 0 ? fees : Math.round(fees / 2);
    feeRecords.push({
      student_id: students[i].id,
      amount,
      method: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
      note: amount >= fees ? "Term fees paid in full" : "First installment",
      paid_at: new Date(Date.now() - (i % 7) * 86400000).toISOString(),
    });
  }
  const { error: feeError } = await supabase.from("fee_payments").insert(feeRecords);
  if (feeError) return { error: feeError.message };

  // ---- expenses ----
  const { error: expenseError } = await supabase.from("expenses").insert(
    DEMO_EXPENSES.map((e) => ({
      payee: e.payee,
      category: e.category,
      description: e.description,
      amount: e.amount,
      paid: e.paid,
      date: isoDaysAgo(e.daysAgo),
      method: e.method,
    }))
  );
  if (expenseError) return { error: expenseError.message };

  await logActivity(
    supabase,
    "import",
    `Loaded demo data: ${teachers.length} teachers, ${students.length} students, attendance, exams, fees and expenses`
  );
  revalidatePath("/", "layout");
  return {
    success: true,
    summary: `${teachers.length} teachers, ${students.length} students, ${attendanceRecords.length} attendance records, ${students.length} exam records, ${feeRecords.length} fee payments, ${DEMO_EXPENSES.length} expenses and a weekly timetable`,
  };
}
