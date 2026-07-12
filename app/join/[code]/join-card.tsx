"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinSchoolWithCode } from "@/lib/actions/school";
import { logout } from "@/lib/actions/auth";

export function JoinCard({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinSchoolWithCode(code);
      if (result.error) {
        setError(result.error);
        return;
      }
      setJoined(result.name ?? "your school");
      // Pending (family-link) joiners land on the waiting screen; the
      // app layout routes them there from "/".
      router.push("/");
      router.refresh();
    });
  }

  if (joined) {
    return (
      <div className="text-center space-y-2">
        <h1 className="text-[17px] font-semibold tracking-tight">Welcome to {joined}!</h1>
        <p className="text-[13px] text-text-2">Taking you to the dashboard…</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-[17px] font-semibold tracking-tight">You&apos;ve been invited</h1>
      <p className="text-[13px] text-text-2">
        This link adds your account to the school — you&apos;ll see its students, classes,
        attendance and more right away. The first person to join a new school becomes its admin.
      </p>
      {error && (
        <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2 text-left">{error}</p>
      )}
      <Button onClick={join} disabled={pending} className="w-full">
        <KeyRound size={15} /> {pending ? "Joining…" : "Join school"}
      </Button>
      <button
        onClick={() => logout()}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
      >
        <LogOut size={13} /> Not you? Sign out
      </button>
    </div>
  );
}
