import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/data/messages";
import { gatewayName } from "@/lib/sms/gateway";
import { SetupNotice } from "@/components/setup-notice";
import { MessagesView } from "@/components/messages/messages-view";

export default async function MessagesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice what="messages" />;
  }

  const notifications = await listNotifications();

  return <MessagesView notifications={notifications} gateway={gatewayName()} />;
}
