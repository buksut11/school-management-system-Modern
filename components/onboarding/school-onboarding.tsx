"use client";

import { useActionState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { joinSchool } from "@/lib/actions/school";
import { logout } from "@/lib/actions/auth";

// Schools are provisioned manually by the platform owner — there is no
// self-serve "create a school" here on purpose. New accounts join their
// school with the invite code/link its admin (or the owner) shared.
export function SchoolOnboarding({ fullName }: { fullName: string }) {
  const [joinState, joinAction, joining] = useActionState(joinSchool, undefined);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md">
        <h1 className="text-[18px] font-semibold tracking-tight mb-1">
          Welcome{fullName ? `, ${fullName}` : ""}
        </h1>
        <p className="text-[13px] text-text-2 mb-4">
          Your account isn&apos;t part of a school yet. Open the invite link you were sent — or
          enter its code here. Invites are personal and work once, so if yours was already used
          or expired, ask the school for a new one.
        </p>

        <form action={joinAction} className="space-y-3">
          <div>
            <Label htmlFor="join_code">Join code</Label>
            <Input id="join_code" name="code" placeholder="e.g. 3fa92c1b04d7" required />
          </div>
          {joinState?.error && (
            <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{joinState.error}</p>
          )}
          <Button type="submit" disabled={joining} className="w-full">
            <KeyRound size={15} /> {joining ? "Joining…" : "Join school"}
          </Button>
        </form>

        <p className="mt-4 text-[12px] text-text-2">
          School not on the platform yet? Contact the administrator to have it registered.
        </p>

        <button
          onClick={() => logout()}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </Card>
    </div>
  );
}
