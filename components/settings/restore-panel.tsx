"use client";

import { useRef, useState } from "react";
import { Upload, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { restoreFromBackup, type BackupSnapshot } from "@/lib/actions/backup";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";

export function RestorePanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [snapshot, setSnapshot] = useState<BackupSnapshot | null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const t = useT();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupSnapshot;
      if (!parsed.data || !parsed.school) throw new Error("invalid");
      setSnapshot(parsed);
      setFileName(file.name);
    } catch {
      setError(t("set.restoreInvalid"));
      setSnapshot(null);
      setFileName("");
    }
  }

  async function onRestore() {
    if (!snapshot) return;
    if (confirmText !== "RESTORE") {
      setError(t("set.restoreTypeToConfirm"));
      return;
    }
    if (!password) {
      setError(t("set.restoreEnterPassword"));
      return;
    }
    setBusy(true);
    setError("");
    const result = await restoreFromBackup(password, snapshot);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    show(t("set.restored"));
    setSnapshot(null);
    setFileName("");
    setPassword("");
    setConfirmText("");
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.restore")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.restoreDesc")}</p>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-2xl border border-dashed border-line bg-card-2/60 hover:bg-card-2 transition-colors py-6 flex flex-col items-center gap-2 mb-4"
      >
        <Upload size={18} className="text-text-2" />
        <span className="text-[13px] font-medium">{fileName || t("set.chooseBackup")}</span>
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={onFile} className="hidden" />

      {snapshot && (
        <div className="space-y-3">
          <div className="rounded-xl bg-orange/10 text-orange px-3.5 py-2.5 text-[12.5px] flex gap-2">
            <TriangleAlert size={15} className="flex-none mt-0.5" />
            <span>{t("set.restoreWarn", { date: new Date(snapshot.created_at).toLocaleString() })}</span>
          </div>

          <div>
            <Label htmlFor="restore-confirm">{t("set.typeRestoreLabel")}</Label>
            <Input
              id="restore-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESTORE"
            />
          </div>

          <div>
            <Label htmlFor="restore-password">{t("set.accountPassword")}</Label>
            <Input
              id="restore-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}

          <Button variant="danger" onClick={onRestore} disabled={busy} className="w-full">
            {busy ? t("set.restoring") : t("set.restoreNow")}
          </Button>
        </div>
      )}
      {!snapshot && error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}
    </Card>
  );
}
