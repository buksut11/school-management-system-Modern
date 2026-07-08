import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Both the sidebar (in the layout) and the dashboard page independently
// need active student/teacher counts and today's attendance rows. Layouts
// and pages render as part of the same request on a full page load, so
// without this they'd hit Supabase twice for the same data. React's
// request-scoped cache() makes repeat calls within one request reuse the
// first result instead of re-querying.

export const getActiveCounts = cache(async () => {
  const supabase = await createClient();
  const [{ count: students }, { count: teachers }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("teachers").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return { students: students ?? 0, teachers: teachers ?? 0 };
});

export const getTodayAttendance = cache(async () => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from("attendance").select("status").eq("date", today);
  const rows = data ?? [];
  return {
    present: rows.filter((a) => a.status === "present").length,
    late: rows.filter((a) => a.status === "late").length,
    absent: rows.filter((a) => a.status === "absent").length,
  };
});
