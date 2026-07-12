"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinSchoolWithCode } from "@/lib/actions/school";
import { logout } from "@/lib/actions/auth";

const ROLE_BLURB: Record<string, string> = {
  admin: "as its administrator — you'll run the school and invite everyone else",
  staff: "as office staff — daily records and the fees desk",
  finance: "as finance — the school's money, including expenses",
  teacher: "as a teacher — attendance and grades for your class",
  student: "as a student — you'll see your own records and fees",
  parent: "as a parent — you'll follow your child's progress and fees",
};

export function JoinCard({
  code,
  valid,
  schoolName,
  role,
  reason,
}: {
  code: string;
  valid: boolean;
  schoolName: string | null;
  role: string | null;
  reason: string | null;
}) {
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
      router.push("/");
      router.refresh();
    });
  }

  if (!valid) {
    return (
      <div className="text-center space-y-3">
        <AlertTriangle size={26} className="mx-auto text-orange" />
        <h1 className="text-[17px] font-semibold tracking-tight">This invite can&apos;t be used</h1>
        <p className="text-[13px] text-text-2">{reason ?? "Ask the school for a new invite."}</p>
        <button
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="text-center space-y-2">
        <h1 className="text-[17px] font-semibold tracking-tight">Welcome to {joined}!</h1>
        <p className="text-[13px] text-text-2">Taking you to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-[17px] font-semibold tracking-tight">
        You&apos;re invited to {schoolName ?? "a school"}
      </h1>
      <p className="text-[13px] text-text-2">
        This personal invite joins your account {ROLE_BLURB[role ?? ""] ?? "to the school"}. It
        works exactly once.
      </p>
      {error && (
        <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2 text-left">{error}</p>
      )}
      <Button onClick={join} disabled={pending} className="w-full">
        <KeyRound size={15} /> {pending ? "Joining…" : `Join ${schoolName ?? "school"}`}
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
