"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinSchoolWithCode } from "@/lib/actions/school";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

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
  const t = useT();
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
      setJoined(result.name ?? t("join.yourSchool"));
      router.push("/");
      router.refresh();
    });
  }

  if (!valid) {
    return (
      <div className="text-center space-y-3">
        <AlertTriangle size={26} className="mx-auto text-orange" />
        <h1 className="text-[17px] font-semibold tracking-tight">{t("join.invalidTitle")}</h1>
        <p className="text-[13px] text-text-2">{reason ?? t("join.invalidReason")}</p>
        <button
          onClick={() => logout()}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> {t("join.signOut")}
        </button>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="text-center space-y-2">
        <h1 className="text-[17px] font-semibold tracking-tight">{t("join.welcomeTo", { name: joined })}</h1>
        <p className="text-[13px] text-text-2">{t("join.takingYou")}</p>
      </div>
    );
  }

  const blurb = role ? t(`join.blurb.${role}` as MessageKey) : t("join.blurbFallback");

  return (
    <div className="text-center space-y-4">
      <h1 className="text-[17px] font-semibold tracking-tight">
        {t("join.invitedTo", { name: schoolName ?? t("join.aSchool") })}
      </h1>
      <p className="text-[13px] text-text-2">{t("join.explain", { blurb })}</p>
      {error && (
        <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2 text-left">{error}</p>
      )}
      <Button onClick={join} disabled={pending} className="w-full">
        <KeyRound size={15} /> {pending ? t("join.joining") : t("join.joinBtn", { name: schoolName ?? t("join.school") })}
      </Button>
      <button
        onClick={() => logout()}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
      >
        <LogOut size={13} /> {t("join.notYouSignOut")}
      </button>
    </div>
  );
}
