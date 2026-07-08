import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getTableCounts } from "@/lib/data/settings";
import { SetupNotice } from "@/components/setup-notice";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="settings" />;
  }

  const counts = await getTableCounts();

  return <SettingsView counts={counts} />;
}
