"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queueFeeReminders, queueAbsenceAlerts } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/toast";

const DEFAULTS = {
  fees: {
    title: "Queue fee reminders",
    template:
      "Dear parent, {student} has an outstanding school fee balance of ${balance}. Kindly arrange payment. — {school}",
    placeholders: "{student} {class} {balance} {overdue} {school}",
    explain:
      "One message per active student with an outstanding balance and a parent phone number. Students with a reminder already pending are skipped.",
  },
  absence: {
    title: "Queue absence alerts",
    template:
      "Dear parent, {student} was marked absent from school on {date}. Please contact the office if this is unexpected. — {school}",
    placeholders: "{student} {class} {date} {school}",
    explain:
      "One message per student marked absent on the chosen day. Each absence is only ever alerted once.",
  },
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
  const cfg = DEFAULTS[kind];
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
      const parts = [`${result.queued} queued`];
      if (result.no_phone) parts.push(`${result.no_phone} without a parent number`);
      if (result.already) parts.push(`${result.already} already covered`);
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
            <Label htmlFor="alert-date">Day</Label>
            <Input
              id="alert-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}

        <div>
          <Label htmlFor="msg-template">Message</Label>
          <textarea
            id="msg-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={4}
            className="w-full rounded-xl px-3.5 py-2.5 text-[14px] bg-input text-text placeholder:text-text-2 border border-transparent transition-all duration-200 focus:bg-solid focus:border-blue/30 focus:ring-4 focus:ring-blue-soft resize-y"
          />
          <p className="text-[11.5px] text-text-2 mt-1">
            Placeholders: <span className="font-mono">{cfg.placeholders}</span>
          </p>
        </div>

        {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={queue} disabled={pending || !template.trim()}>
            {pending ? "Queueing…" : "Queue messages"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
