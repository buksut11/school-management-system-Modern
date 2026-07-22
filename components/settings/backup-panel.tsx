"use client";

import { useState } from "react";
import { DownloadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBackupSnapshot } from "@/lib/actions/backup";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";

export function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const t = useT();

  async function download() {
    setBusy(true);
    try {
      const snapshot = await createBackupSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sh-asharow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      show(t("set.backupDownloaded"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.systemBackup")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.systemBackupDesc")}</p>
      <Button onClick={download} disabled={busy} variant="secondary">
        <DownloadCloud size={15} /> {busy ? t("set.preparing") : t("set.downloadBackup")}
      </Button>
    </Card>
  );
}
