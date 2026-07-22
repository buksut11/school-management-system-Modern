"use client";

import { useActionState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { joinSchool } from "@/lib/actions/school";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";

// Schools are provisioned manually by the platform owner — there is no
// self-serve "create a school" here on purpose. New accounts join their
// school with the invite code/link its admin (or the owner) shared.
export function SchoolOnboarding({ fullName }: { fullName: string }) {
  const [joinState, joinAction, joining] = useActionState(joinSchool, undefined);
  const t = useT();

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md">
        <h1 className="text-[18px] font-semibold tracking-tight mb-1">
          {fullName ? t("onboard.welcomeName", { name: fullName }) : t("onboard.welcome")}
        </h1>
        <p className="text-[13px] text-text-2 mb-4">{t("onboard.intro")}</p>

        <form action={joinAction} className="space-y-3">
          <div>
            <Label htmlFor="join_code">{t("onboard.joinCode")}</Label>
            <Input id="join_code" name="code" placeholder="e.g. 3fa92c1b04d7" required />
          </div>
          {joinState?.error && (
            <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{joinState.error}</p>
          )}
          <Button type="submit" disabled={joining} className="w-full">
            <KeyRound size={15} /> {joining ? t("onboard.joining") : t("onboard.joinSchool")}
          </Button>
        </form>

        <p className="mt-4 text-[12px] text-text-2">{t("onboard.notOnPlatform")}</p>

        <button
          onClick={() => logout()}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> {t("common.signOut")}
        </button>
      </Card>
    </div>
  );
}
