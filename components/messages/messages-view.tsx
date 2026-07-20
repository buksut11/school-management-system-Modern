"use client";

import { useMemo, useState, useTransition } from "react";
import { Wallet, CalendarX, Download, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { ComposeModal } from "./compose-modal";
import { markNotificationsSent, deleteNotification } from "@/lib/actions/messages";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { downloadCsv } from "@/lib/csv";
import { formatDate, relativeTime } from "@/lib/utils";
import type { NotificationRow } from "@/lib/data/messages";

const STATUS_TONE = { pending: "orange", sent: "green", failed: "red" } as const;
const KIND_LABEL = { fee_reminder: "Fee reminder", absence: "Absence", general: "General" } as const;

export function MessagesView({ notifications }: { notifications: NotificationRow[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [compose, setCompose] = useState<"fees" | "absence" | null>(null);
  const [, startTransition] = useTransition();
  const { show } = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(
    () => notifications.filter((n) => statusFilter === "all" || n.status === statusFilter),
    [notifications, statusFilter]
  );
  const pending = notifications.filter((n) => n.status === "pending");

  function exportPending() {
    downloadCsv(
      "messages-pending.csv",
      pending.map((n) => ({ recipient: n.recipient, message: n.body }))
    );
  }

  async function markAllSent() {
    const ok = await confirm({
      title: `Mark ${pending.length} pending message${pending.length === 1 ? "" : "s"} as sent?`,
      message: "Do this after delivering them through your SMS portal.",
      confirmLabel: "Mark sent",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await markNotificationsSent(pending.map((n) => n.id));
      show(result.error ?? `${result.marked} message${result.marked === 1 ? "" : "s"} marked as sent`);
    });
  }

  async function onDelete(n: NotificationRow) {
    const ok = await confirm({ title: "Remove this message?", confirmLabel: "Remove" });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteNotification(n.id);
      show(result.error ?? "Message removed");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button onClick={() => setCompose("fees")}>
          <Wallet size={15} /> Fee reminders
        </Button>
        <Button onClick={() => setCompose("absence")}>
          <CalendarX size={15} /> Absence alerts
        </Button>
        <div className="flex-1" />
        <Segmented
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All" },
            { value: "pending", label: `Pending${pending.length ? ` (${pending.length})` : ""}` },
            { value: "sent", label: "Sent" },
          ]}
        />
        {pending.length > 0 && (
          <>
            <Button variant="secondary" size="md" onClick={exportPending}>
              <Download size={15} /> Export pending
            </Button>
            <Button variant="secondary" size="md" onClick={markAllSent}>
              <CheckCheck size={15} /> Mark sent
            </Button>
          </>
        )}
      </div>

      <p className="text-[12.5px] text-text-2">
        Messages queue here with the parent&apos;s number and the final text. Export the pending
        list as CSV for any bulk-SMS portal (Hormuud, Somtel, …), send it there, then mark them
        sent — or connect a gateway worker to deliver them automatically.
      </p>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[13.5px] text-text-2">
            No messages yet — queue fee reminders or absence alerts above.
          </p>
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
                      {n.student_name ?? "—"} · {KIND_LABEL[n.kind]}
                      {n.ref_date ? ` · ${formatDate(n.ref_date)}` : ""}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-text-2 mt-0.5">{n.body}</p>
                  {n.error && <p className="text-[12px] text-red mt-0.5">{n.error}</p>}
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className="text-[11.5px] text-text-2">{relativeTime(n.created_at)}</span>
                  <Badge tone={STATUS_TONE[n.status]}>
                    {n.status[0].toUpperCase() + n.status.slice(1)}
                  </Badge>
                  <button
                    onClick={() => onDelete(n)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-2 hover:bg-red/10 hover:text-red transition-colors"
                    aria-label="Remove message"
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
