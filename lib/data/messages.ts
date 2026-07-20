import { createClient } from "@/lib/supabase/server";
import type { NotificationKind, NotificationStatus } from "@/lib/types/database";

export type NotificationRow = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  kind: NotificationKind;
  recipient: string;
  body: string;
  status: NotificationStatus;
  error: string | null;
  ref_date: string | null;
  created_at: string;
  sent_at: string | null;
};

type RawNotification = Omit<NotificationRow, "student_name"> & {
  students: { full_name: string } | null;
};

export async function listNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, student_id, kind, recipient, body, status, error, ref_date, created_at, sent_at, students(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<RawNotification[]>();

  return (data ?? []).map((n) => ({
    id: n.id,
    student_id: n.student_id,
    student_name: n.students?.full_name ?? null,
    kind: n.kind,
    recipient: n.recipient,
    body: n.body,
    status: n.status,
    error: n.error,
    ref_date: n.ref_date,
    created_at: n.created_at,
    sent_at: n.sent_at,
  }));
}
