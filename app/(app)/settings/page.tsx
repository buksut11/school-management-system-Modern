import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getTableCounts } from "@/lib/data/settings";
import { listAcademicYears } from "@/lib/data/years";
import { getSchool } from "@/lib/data/school";
import { SetupNotice } from "@/components/setup-notice";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="settings" />;
  }

  const [counts, years, school] = await Promise.all([
    getTableCounts(),
    listAcademicYears(),
    getSchool(),
  ]);

  return <SettingsView counts={counts} years={years} school={school} />;
}
