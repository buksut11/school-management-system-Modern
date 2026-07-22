"use client";

import { useActionState } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifyMfaChallenge } from "@/lib/actions/mfa";
import { logout } from "@/lib/actions/auth";

// Shown by the app layout when the account has two-factor enabled but the
// current session hasn't completed the code step yet.
export function MfaChallenge() {
  const [state, formAction, pending] = useActionState(verifyMfaChallenge, undefined);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md">
        <div className="text-center mb-5">
          <ShieldCheck size={28} className="mx-auto mb-3 text-blue" />
          <h1 className="text-[18px] font-semibold tracking-tight mb-1">Two-factor verification</h1>
          <p className="text-[13px] text-text-2">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              autoFocus
              required
            />
          </div>
          {state?.error && (
            <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Verifying…" : "Verify"}
          </Button>
        </form>

        <button
          onClick={() => logout()}
          className="mt-4 mx-auto flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </Card>
    </div>
  );
}
