import { ExportPanel } from "./export-panel";
import { ImportWizard } from "./import-wizard";
import { BackupPanel } from "./backup-panel";
import { RestorePanel } from "./restore-panel";

export function SettingsView({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
      <div className="space-y-4">
        <ExportPanel counts={counts} />
        <ImportWizard />
      </div>
      <div className="space-y-4">
        <BackupPanel />
        <RestorePanel />
      </div>
    </div>
  );
}
