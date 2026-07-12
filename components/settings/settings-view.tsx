import { ExportPanel } from "./export-panel";
import { ImportWizard } from "./import-wizard";
import { BackupPanel } from "./backup-panel";
import { RestorePanel } from "./restore-panel";
import { DemoDataPanel } from "./demo-data-panel";
import { AcademicYearPanel } from "./academic-year-panel";
import { SchoolPanel } from "./school-panel";
import { MembersPanel } from "./members-panel";
import { PlatformPanel } from "./platform-panel";
import type { AcademicYear, School } from "@/lib/types/database";
import type { Member, PersonOption } from "@/lib/data/members";
import type { PlatformSchool } from "@/lib/data/platform";

export function SettingsView({
  counts,
  years,
  school,
  members,
  currentUserId,
  isAdmin,
  platformSchools,
  studentOptions,
  teacherOptions,
}: {
  counts: Record<string, number>;
  years: AcademicYear[];
  school: School | null;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  platformSchools: PlatformSchool[] | null;
  studentOptions: PersonOption[];
  teacherOptions: PersonOption[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        {platformSchools && (
          <PlatformPanel schools={platformSchools} ownSchoolId={school?.id ?? null} />
        )}
        {school && <SchoolPanel school={school} />}
        {school && (
          <MembersPanel
            members={members}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            students={studentOptions}
            teachers={teacherOptions}
          />
        )}
        <AcademicYearPanel years={years} />
        <ExportPanel counts={counts} />
        <ImportWizard />
      </div>
      <div className="space-y-4">
        <DemoDataPanel />
        <BackupPanel />
        <RestorePanel />
      </div>
    </div>
  );
}
