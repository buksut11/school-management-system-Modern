import { Users, GraduationCap, CalendarCheck, Wallet } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/data/dashboard";
import { SetupNotice } from "@/components/setup-notice";
import { MetricCard } from "@/components/dashboard/metric-card";
import { GlanceCard } from "@/components/dashboard/glance-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="dashboard data" />;
  }

  const data = await getDashboardData();

  return (
    <div className="space-y-5 max-w-6xl">
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
