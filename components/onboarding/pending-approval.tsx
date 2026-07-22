"use client";

import { Hourglass, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";

export function PendingApproval({ fullName }: { fullName: string }) {
  const t = useT();
  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md text-center">
        <Hourglass size={28} className="mx-auto mb-3 text-orange" />
        <h1 className="text-[18px] font-semibold tracking-tight mb-1">
          {fullName ? t("pending.titleName", { name: fullName }) : t("pending.title")}
        </h1>
        <p className="text-[13px] text-text-2">{t("pending.body")}</p>
        <button
          onClick={() => logout()}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text transition-colors"
        >
          <LogOut size={13} /> {t("common.signOut")}
        </button>
      </Card>
    </div>
  );
}
