import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getAttendanceTrend, getFeeCollectionTrend, getClassPerformance, getExpensesByCategory } from "@/lib/data/reports";
import { SetupNotice } from "@/components/setup-notice";
import { ReportsView } from "@/components/reports/reports-view";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="reports" />;
  }

  const { days: daysParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;

  const [attendance, fees, classPerformance, expenses] = await Promise.all([
    getAttendanceTrend(days),
    getFeeCollectionTrend(days),
    getClassPerformance(),
    getExpensesByCategory(),
  ]);

  return (
    <ReportsView key={days} days={days} attendance={attendance} fees={fees} classPerformance={classPerformance} expenses={expenses} />
  );
}
