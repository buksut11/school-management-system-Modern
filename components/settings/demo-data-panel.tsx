"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/lib/actions/demo";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useT } from "@/lib/i18n/client";

export function DemoDataPanel() {
  const [busy, setBusy] = useState(false);
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  async function load() {
    const ok = await confirm({
      title: t("set.demoLoadTitle"),
      message: t("set.demoLoadMsg"),
      confirmLabel: t("set.load"),
      tone: "primary",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await seedDemoData();
      if ("error" in result) {
        show(result.error);
      } else {
        show(t("set.demoLoaded", { summary: result.summary }));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.demoData")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.demoDataDesc")}</p>
      <Button onClick={load} disabled={busy} variant="secondary">
        <Sparkles size={15} /> {busy ? t("set.loading") : t("set.loadDemo")}
      </Button>
    </Card>
  );
}
