import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listFees, getFeeSchedule } from "@/lib/data/fees";
import { listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { FeesView } from "@/components/fees/fees-view";

export default async function FeesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="fees" />;
  }

  const [rows, classes, schedule] = await Promise.all([
    listFees(),
    listClassOptions(),
    getFeeSchedule(),
  ]);

  return <FeesView rows={rows} classes={classes} schedule={schedule} />;
}
