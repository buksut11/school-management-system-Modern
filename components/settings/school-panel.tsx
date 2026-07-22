"use client";

import { useActionState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { renameSchool } from "@/lib/actions/school";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";
import type { School } from "@/lib/types/database";

export function SchoolPanel({ school }: { school: School }) {
  const [state, formAction, pending] = useActionState(renameSchool, undefined);
  const { show } = useToast();
  const t = useT();

  useEffect(() => {
    if (state?.success) show(t("set.schoolNameUpdated"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.school")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.schoolDesc")}</p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={school.id} />
        <div>
          <Label htmlFor="school_rename">{t("field.name")}</Label>
          <div className="flex gap-2">
            <Input id="school_rename" name="name" defaultValue={school.name} required />
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
        {state?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
        )}
      </form>
    </Card>
  );
}
