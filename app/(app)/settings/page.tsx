import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getTableCounts } from "@/lib/data/settings";
import { listAcademicYears } from "@/lib/data/years";
import { getSchool } from "@/lib/data/school";
import {
  listMembers,
  listOpenInvites,
  listStudentOptions,
  listTeacherOptions,
} from "@/lib/data/members";
import { getIsPlatformAdmin, listPlatformSchools } from "@/lib/data/platform";
import { getMfaState } from "@/lib/actions/mfa";
import { SetupNotice } from "@/components/setup-notice";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="settings" />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    counts,
    years,
    school,
    members,
    invites,
    isPlatformAdmin,
    studentOptions,
    teacherOptions,
    { enabled: mfaEnabled },
  ] = await Promise.all([
    getTableCounts(),
    listAcademicYears(),
    getSchool(),
    listMembers(),
    listOpenInvites(),
    getIsPlatformAdmin(),
    listStudentOptions(),
    listTeacherOptions(),
    getMfaState(),
  ]);
  const platformSchools = isPlatformAdmin ? await listPlatformSchools() : null;

  const currentUserId = user?.id ?? "";
  const isAdmin = members.some((m) => m.id === currentUserId && m.role === "admin");

  return (
    <SettingsView
      counts={counts}
      years={years}
      school={school}
      members={members}
      invites={invites}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      platformSchools={platformSchools}
      studentOptions={studentOptions}
      teacherOptions={teacherOptions}
      mfaEnabled={mfaEnabled}
    />
  );
}
