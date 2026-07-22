"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { startMfaEnrollment, confirmMfaEnrollment, disableMfa } from "@/lib/actions/mfa";

type Enrolling = { factorId: string; qrCode: string; secret: string };

export function SecurityPanel({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

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
      show("Two-factor authentication is on");
    });
  }

  async function turnOff() {
    const ok = await confirm({
      title: "Turn off two-factor?",
      message: "Your account will be protected by password only.",
      confirmLabel: "Turn off",
    });
    if (!ok) return;
    start(async () => {
      const result = await disableMfa();
      if (result.error) {
        show(result.error);
        return;
      }
      setEnabled(false);
      show("Two-factor authentication is off");
    });
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">Security</h3>
      <p className="text-[12.5px] text-text-2 mb-4">
        Two-factor authentication adds a 6-digit code from an app on your phone (Google
        Authenticator, Authy, Microsoft Authenticator) on top of your password. Recommended for
        admin and finance accounts.
      </p>

      {enabled && !enrolling && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-green/10 px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={18} className="text-green flex-none" />
            <div className="text-[13px] font-medium">Two-factor is on for your account.</div>
          </div>
          <Button variant="secondary" size="md" onClick={turnOff} disabled={pending}>
            <ShieldOff size={15} /> Turn off
          </Button>
        </div>
      )}

      {!enabled && !enrolling && (
        <Button onClick={begin} disabled={pending}>
          <ShieldCheck size={15} /> {pending ? "Starting…" : "Enable two-factor"}
        </Button>
      )}

      {enrolling && (
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-medium mb-2">1. Scan this with your authenticator app</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qrCode}
              alt="Two-factor QR code"
              className="w-40 h-40 rounded-xl border border-line bg-white p-2"
            />
            <p className="mt-2 text-[12px] text-text-2">
              Can&apos;t scan? Enter this key manually:
            </p>
            <code className="mt-1 block break-all rounded-lg bg-hover px-2.5 py-1.5 text-[12px] font-mono">
              {enrolling.secret}
            </code>
          </div>

          <div>
            <Label htmlFor="mfa_code">2. Enter the 6-digit code it shows</Label>
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
                {pending ? "Verifying…" : "Verify"}
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
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}
    </Card>
  );
}
