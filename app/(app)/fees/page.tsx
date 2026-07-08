import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listFees } from "@/lib/data/fees";
import { listClassOptions } from "@/lib/data/students";
import { SetupNotice } from "@/components/setup-notice";
import { FeesView } from "@/components/fees/fees-view";

export default async function FeesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="fees" />;
  }

  const [rows, classes] = await Promise.all([listFees(), listClassOptions()]);

  return <FeesView rows={rows} classes={classes} />;
}
