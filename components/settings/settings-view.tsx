import { ExportPanel } from "./export-panel";
import { ImportWizard } from "./import-wizard";
import { BackupPanel } from "./backup-panel";
import { RestorePanel } from "./restore-panel";
import { DemoDataPanel } from "./demo-data-panel";
import { AcademicYearPanel } from "./academic-year-panel";
import { SchoolPanel } from "./school-panel";
import type { AcademicYear, School } from "@/lib/types/database";

export function SettingsView({
  counts,
  years,
  school,
}: {
  counts: Record<string, number>;
  years: AcademicYear[];
  school: School | null;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        {school && <SchoolPanel school={school} />}
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
