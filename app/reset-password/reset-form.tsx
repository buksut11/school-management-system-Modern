"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="confirm">Repeat it</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Same password again"
          autoComplete="new-password"
          required
        />
      </div>
      {state?.error && (
        <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
