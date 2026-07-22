"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queueFeeReminders, queueAbsenceAlerts } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n/client";

const PLACEHOLDERS = {
  fees: "{student} {class} {balance} {overdue} {school}",
  absence: "{student} {class} {date} {school}",
} as const;

export function ComposeModal({
  open,
  kind,
  onClose,
}: {
  open: boolean;
  kind: "fees" | "absence";
  onClose: () => void;
}) {
  const t = useT();
  const cfg =
    kind === "fees"
      ? {
          title: t("msg.queueFeeReminders"),
          template: t("msg.feesTemplate"),
          explain: t("msg.feeRemindersDesc"),
        }
      : {
          title: t("msg.queueAbsenceAlerts"),
          template: t("msg.absenceTemplate"),
          explain: t("msg.absenceAlertsDesc"),
        };
  const [template, setTemplate] = useState<string>(cfg.template);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  function queue() {
    setError("");
    startTransition(async () => {
      const result =
        kind === "fees"
          ? await queueFeeReminders(template)
          : await queueAbsenceAlerts(date, template);
      if (result.error) {
        setError(result.error);
        return;
      }
      const parts = [t("msg.nQueued", { count: result.queued ?? 0 })];
      if (result.no_phone) parts.push(t("msg.nNoPhone", { count: result.no_phone }));
      if (result.already) parts.push(t("msg.nAlready", { count: result.already }));
      show(parts.join(" · "));
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={cfg.title} widthClass="max-w-xl">
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-2">{cfg.explain}</p>

        {kind === "absence" && (
          <div>
            <Label htmlFor="alert-date">{t("field.day")}</Label>
            <Input
              id="alert-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="msg-template">{t("field.message")}</Label>
          <textarea
            id="msg-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={4}
            className="w-full rounded-xl px-3.5 py-2.5 text-[14px] bg-input text-text placeholder:text-text-2 border border-transparent transition-all duration-200 focus:bg-solid focus:border-blue/30 focus:ring-4 focus:ring-blue-soft resize-y"
          />
          <p className="text-[11.5px] text-text-2 mt-1">
            {t("msg.placeholdersLabel")} <span className="font-mono">{PLACEHOLDERS[kind]}</span>
          </p>
        </div>

        {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={queue} disabled={pending || !template.trim()}>
            {pending ? t("msg.queueing") : t("msg.queueMessages")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
