import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listAttendance } from "@/lib/data/attendance";
import { listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { AttendanceView } from "@/components/attendance/attendance-view";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="attendance" />;
  }

  const { date: dateParam } = await searchParams;
  const date = dateParam ?? new Date().toISOString().slice(0, 10);

  const [rows, classes] = await Promise.all([listAttendance(date), listClassOptions()]);

  return <AttendanceView key={date} date={date} rows={rows} classes={classes} />;
}
