import { Users, GraduationCap, CalendarCheck, Wallet } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/data/dashboard";
import { getFamilyChildren } from "@/lib/data/family";
import { SetupNotice } from "@/components/setup-notice";
import { MetricCard } from "@/components/dashboard/metric-card";
import { GlanceCard } from "@/components/dashboard/glance-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { FamilyDashboard } from "@/components/family/family-dashboard";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="dashboard data" />;
  }

  // Student and parent accounts get the family view — their child's
  // attendance, latest results and fee balance — instead of the staff
  // dashboard, whose school-wide numbers RLS reduces to noise for them.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
    : { data: null };

  if (profile?.role === "student" || profile?.role === "parent") {
    const kids = await getFamilyChildren();
    return <FamilyDashboard greetingName={profile.full_name || ""}>{kids}</FamilyDashboard>;
  }

  const data = await getDashboardData();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Students" value={String(data.studentCount)} icon={Users} tone="blue" />
        <MetricCard label="Total Teachers" value={String(data.teacherCount)} icon={GraduationCap} tone="purple" />
        <MetricCard
          label="Attendance Today"
          value={`${data.attendanceRate}%`}
          icon={CalendarCheck}
          tone="green"
        />
        <MetricCard
          label={`Fees Collected (${data.feesRate}%)`}
          value={formatMoney(data.feesCollected)}
          icon={Wallet}
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 items-start">
        <ActivityFeed items={data.activity} />
        <GlanceCard
          present={data.present}
          late={data.late}
          absent={data.absent}
          total={data.studentCount}
        />
      </div>
    </div>
  );
}
