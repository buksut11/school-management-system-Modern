"use client";

import { Hourglass, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { logout } from "@/lib/actions/auth";

export function PendingApproval({ fullName }: { fullName: string }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md text-center">
        <Hourglass size={28} className="mx-auto mb-3 text-orange" />
        <h1 className="text-[18px] font-semibold tracking-tight mb-1">
          Almost there{fullName ? `, ${fullName}` : ""}
        </h1>
        <p className="text-[13px] text-text-2">
          You&apos;ve joined the school — the office just needs to link your account to the right
          student record and set your access. Check back soon, or ask the school office to
          approve you in Settings → Members.
        </p>
        <button
          onClick={() => logout()}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </Card>
    </div>
  );
}
