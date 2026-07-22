"use client";

import { useActionState, useEffect, useState } from "react";
import { Building2, Check, Link2, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import {
  platformCreateSchool,
  platformDeleteSchool,
  platformAdminInvite,
} from "@/lib/actions/platform";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { PlatformSchool } from "@/lib/data/platform";
import type { FormState } from "@/lib/actions/students";

export function PlatformPanel({
  schools,
  ownSchoolId,
}: {
  schools: PlatformSchool[];
  ownSchoolId: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(platformCreateSchool, undefined);
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  const [seen, setSeen] = useState<FormState>(undefined);
  if (state !== seen) {
    setSeen(state);
    if (state?.success) setAdding(false);
  }

  useEffect(() => {
    if (state?.success) show(t("set.schoolRegistered"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function copyLink(s: PlatformSchool) {
    const result = await platformAdminInvite(s.id);
    if (result.error || !result.code) {
      show(result.error ?? t("set.cantFetchInvite"));
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/join/${result.code}`);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  async function onDelete(s: PlatformSchool) {
    const ok = await confirm({
      title: t("set.removeSchoolTitle", { name: s.name }),
      message: t("set.removeSchoolMsg", { students: s.students, members: s.members }),
      confirmLabel: t("set.deleteSchool"),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await platformDeleteSchool(s.id, s.name);
      show(result.error ?? t("set.schoolRemoved", { name: s.name }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold tracking-tight mb-1">{t("set.platformTitle")}</h3>
      <p className="text-[12.5px] text-text-2 mb-4">{t("set.platformDesc")}</p>

      <div className="space-y-2 mb-4">
        {schools.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-line px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 size={15} className="text-text-2 flex-none" />
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium truncate">
                  {s.name}
                  {s.id === ownSchoolId && <span className="text-text-2 font-normal"> {t("set.yours")}</span>}
                </div>
                <div className="text-[11.5px] text-text-2">
                  {t("set.schoolMeta", { members: s.members, students: s.students, date: formatDate(s.created_at) })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-none">
              {!s.has_admin && <Badge tone="orange">{t("set.awaitingAdmin")}</Badge>}
              {!s.has_admin && (
                <Button variant="secondary" size="sm" onClick={() => copyLink(s)}>
                  {copiedId === s.id ? <Check size={14} className="text-green" /> : <Link2 size={14} />}
                  {copiedId === s.id ? t("set.copied") : t("set.adminInvite")}
                </Button>
              )}
              {s.id !== ownSchoolId && (
                <button
                  onClick={() => onDelete(s)}
                  disabled={busy}
                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                  aria-label={t("set.deleteAria", { name: s.name })}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor="platform_school_name">{t("set.schoolNameLabel")}</Label>
            <Input id="platform_school_name" name="name" placeholder={t("set.schoolNamePlaceholder")} required />
          </div>
          {state?.error && (
            <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("set.registering") : t("set.registerSchool")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={15} /> {t("set.registerASchool")}
        </Button>
      )}
    </Card>
  );
}
