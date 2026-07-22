"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { startMfaEnrollment, confirmMfaEnrollment, disableMfa } from "@/lib/actions/mfa";
import { useT } from "@/lib/i18n/client";

type Enrolling = { factorId: string; qrCode: string; secret: string };

export function SecurityPanel({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  function begin() {
    setError(null);
    start(async () => {
      const result = await startMfaEnrollment();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEnrolling(result);
      setCode("");
    });
  }

  function confirmCode() {
    if (!enrolling) return;
    setError(null);
    start(async () => {
      const result = await confirmMfaEnrollment(enrolling.factorId, code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEnrolling(null);
      setEnabled(true);
      show(t("set.twoFactorOnToast"));
    });
  }

  async function turnOff() {
    const ok = await confirm({
      title: t("set.turnOffTitle"),
      message: t("set.turnOffMsg"),
      confirmLabel: t("set.turnOff"),
    });
    if (!ok) return;
    start(async () => {
      const result = await disableMfa();
      if (result.error) {
        show(result.error);
        return;
      }
      setEnabled(false);
      show(t("set.twoFactorOffToast"));
    });
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.security")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.securityDesc")}</p>

      {enabled && !enrolling && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-green/10 px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={18} className="text-green flex-none" />
            <div className="text-[13px] font-medium">{t("set.twoFactorOn")}</div>
          </div>
          <Button variant="secondary" size="md" onClick={turnOff} disabled={pending}>
            <ShieldOff size={15} /> {t("set.turnOff")}
          </Button>
        </div>
      )}

      {!enabled && !enrolling && (
        <Button onClick={begin} disabled={pending}>
          <ShieldCheck size={15} /> {pending ? t("set.starting") : t("set.enableTwoFactor")}
        </Button>
      )}

      {enrolling && (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-medium mb-2">{t("set.scanStep")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qrCode}
              alt={t("set.qrAlt")}
              className="w-40 h-40 rounded-xl border border-line bg-white p-2"
            />
            <p className="mt-2 text-[12px] text-text-2">{t("set.cantScan")}</p>
            <code className="mt-1 block break-all rounded-lg bg-hover px-2.5 py-1.5 text-[12px] font-mono">
              {enrolling.secret}
            </code>
          </div>

          <div>
            <Label htmlFor="mfa_code">{t("set.codeStep")}</Label>
            <div className="flex gap-2">
              <Input
                id="mfa_code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
              />
              <Button onClick={confirmCode} disabled={pending || code.replace(/\D/g, "").length < 6}>
                {pending ? t("set.verifying") : t("set.verify")}
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEnrolling(null);
              setError(null);
            }}
            className="text-[12.5px] text-text-2 hover:text-text transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}
    </Card>
  );
}
