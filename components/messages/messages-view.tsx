"use client";

import { useMemo, useState, useTransition } from "react";
import { Wallet, CalendarX, Download, CheckCheck, Trash2, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { ComposeModal } from "./compose-modal";
import {
  markNotificationsSent,
  deleteNotification,
  sendPendingNow,
  retryFailedNotifications,
} from "@/lib/actions/messages";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { formatDate, relativeTime } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { NotificationRow } from "@/lib/data/messages";

const STATUS_TONE = { pending: "orange", sent: "green", failed: "red" } as const;
const STATUS_KEY = { pending: "msg.statusPending", sent: "msg.statusSent", failed: "msg.statusFailed" } as const;
const KIND_KEY = { fee_reminder: "msg.kindFeeReminder", absence: "msg.kindAbsence", general: "msg.kindGeneral" } as const;

export function MessagesView({
  notifications,
  gateway,
}: {
  notifications: NotificationRow[];
  gateway: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [compose, setCompose] = useState<"fees" | "absence" | null>(null);
  const [sending, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();
  const t = useT();

  const filtered = useMemo(
    () => notifications.filter((n) => statusFilter === "all" || n.status === statusFilter),
    [notifications, statusFilter]
  );
  const pending = notifications.filter((n) => n.status === "pending");
  const failedCount = notifications.filter((n) => n.status === "failed").length;

  function sendNow() {
    startTransition(async () => {
      const result = await sendPendingNow();
      if (result.error) {
        show(result.error);
        return;
      }
      const parts = [t("msg.nSent", { count: result.sent ?? 0 })];
      if (result.failed) parts.push(t("msg.nFailed", { count: result.failed }));
      if (result.remaining) parts.push(t("msg.nRemaining", { count: result.remaining }));
      show(parts.join(" · "));
    });
  }

  function retryFailed() {
    startTransition(async () => {
      const result = await retryFailedNotifications();
      show(result.error ?? t("msg.nQueuedAgain", { count: result.retried ?? 0 }));
    });
  }

  function exportPending() {
    downloadCsv(
      "messages-pending.csv",
      pending.map((n) => ({ recipient: n.recipient, message: n.body }))
    );
  }

  async function markAllSent() {
    const ok = await confirm({
      title: t("msg.markAllTitle", { count: pending.length }),
      message: t("msg.markSentHint"),
      confirmLabel: t("msg.markSent"),
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await markNotificationsSent(pending.map((n) => n.id));
      show(result.error ?? t("msg.nMarked", { count: result.marked ?? 0 }));
    });
  }

  async function onDelete(n: NotificationRow) {
    const ok = await confirm({ title: t("msg.removeTitle"), confirmLabel: t("common.remove") });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteNotification(n.id);
      show(result.error ?? t("msg.removed"));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button onClick={() => setCompose("fees")}>
          <Wallet size={15} /> {t("msg.feeReminders")}
        </Button>
        <Button onClick={() => setCompose("absence")}>
          <CalendarX size={15} /> {t("msg.absenceAlerts")}
        </Button>
        <div className="flex-1" />
        <Segmented
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: t("common.all") },
            { value: "pending", label: `${t("msg.filterPending")}${pending.length ? ` (${pending.length})` : ""}` },
            { value: "sent", label: t("msg.filterSent") },
          ]}
        />
        {pending.length > 0 && gateway && (
          <Button size="md" onClick={sendNow} disabled={sending}>
            <Send size={15} /> {sending ? t("msg.sending") : t("msg.sendVia", { gateway })}
          </Button>
        )}
        {pending.length > 0 && (
          <>
            <Button variant="secondary" size="md" onClick={exportPending}>
              <Download size={15} /> {t("msg.exportPending")}
            </Button>
            <Button variant="secondary" size="md" onClick={markAllSent}>
              <CheckCheck size={15} /> {t("msg.markSent")}
            </Button>
          </>
        )}
        {failedCount > 0 && (
          <Button variant="secondary" size="md" onClick={retryFailed} disabled={sending}>
            <RotateCcw size={15} /> {t("msg.retryFailed", { count: failedCount })}
          </Button>
        )}
      </div>

      <p className="text-[12.5px] text-text-2">
        {gateway ? t("msg.gatewayHint", { gateway }) : t("msg.noGatewayHint")}
      </p>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px] text-text-2">{t("msg.emptyList")}</p>
        </Card>
      ) : (
        <div className="rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card overflow-hidden">
          <div className="divide-y divide-line/60">
            {filtered.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium">{n.recipient}</span>
                    <span className="text-[12px] text-text-2">
                      {n.student_name ?? "—"} · {t(KIND_KEY[n.kind] as MessageKey)}
                      {n.ref_date ? ` · ${formatDate(n.ref_date)}` : ""}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-text-2 mt-0.5">{n.body}</p>
                  {n.error && <p className="text-[12px] text-red mt-0.5">{n.error}</p>}
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="text-[11.5px] text-text-2">{relativeTime(n.created_at)}</span>
                  <Badge tone={STATUS_TONE[n.status]}>
                    {t(STATUS_KEY[n.status] as MessageKey)}
                  </Badge>
                  <button
                    onClick={() => onDelete(n)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                    aria-label={t("msg.removeAria")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {compose && (
        <ComposeModal key={compose} open kind={compose} onClose={() => setCompose(null)} />
      )}
    </div>
  );
}
