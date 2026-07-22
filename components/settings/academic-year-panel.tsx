"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { addAcademicYear, setCurrentAcademicYear } from "@/lib/actions/years";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { AcademicYear } from "@/lib/types/database";
import type { FormState } from "@/lib/actions/students";

export function AcademicYearPanel({ years }: { years: AcademicYear[] }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, formAction, pending] = useActionState(addAcademicYear, undefined);
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  // Close the add form as soon as the action succeeds (state adjusted
  // during render, per React's derived-state pattern); the toast is a
  // side effect and stays in the effect below.
  const [seen, setSeen] = useState<FormState>(undefined);
  if (state !== seen) {
    setSeen(state);
    if (state?.success) setAdding(false);
  }

  useEffect(() => {
    if (state?.success) show(t("set.yearAdded"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function makeCurrent(y: AcademicYear) {
    const ok = await confirm({
      title: t("set.switchTitle", { name: y.name }),
      message: t("set.switchMsg"),
      confirmLabel: t("set.switch"),
      tone: "primary",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await setCurrentAcademicYear(y.id, y.name);
      show(result?.error ?? t("set.currentYearNow", { name: y.name }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.academicYears")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.academicYearsDesc")}</p>

      <div className="space-y-2 mb-4">
        {years.map((y) => (
          <div
            key={y.id}
            className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays size={15} className="text-text-2" />
              <div>
                <div className="text-[13.5px] font-medium">{y.name}</div>
                {(y.starts_on || y.ends_on) && (
                  <div className="text-[11.5px] text-text-2">
                    {y.starts_on ? formatDate(y.starts_on) : "—"} → {y.ends_on ? formatDate(y.ends_on) : "—"}
                  </div>
                )}
              </div>
            </div>
            {y.is_current ? (
              <Badge tone="green">{t("set.currentBadge")}</Badge>
            ) : (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => makeCurrent(y)}>
                {t("set.makeCurrent")}
              </Button>
            )}
          </div>
        ))}
        {years.length === 0 && (
          <p className="text-[12.5px] text-text-2">{t("set.noYears")}</p>
        )}
      </div>

      {adding ? (
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="year_name">{t("field.name")}</Label>
            <Input id="year_name" name="name" placeholder={t("set.yearPlaceholder")} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="year_starts">{t("tt.starts")}</Label>
              <Input id="year_starts" name="starts_on" type="date" />
            </div>
            <div>
              <Label htmlFor="year_ends">{t("tt.ends")}</Label>
              <Input id="year_ends" name="ends_on" type="date" />
            </div>
          </div>
          {state?.error && (
            <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("set.adding") : t("set.addYear")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={15} /> {t("set.addAcademicYear")}
        </Button>
      )}
    </Card>
  );
}
