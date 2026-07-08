import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSidebarCounts, type SidebarCounts } from "@/lib/data/dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let fullName = "Admin";
  let counts: SidebarCounts = {
    students: 0,
    teachers: 0,
    present: 0,
    late: 0,
    absent: 0,
    feesOwing: 0,
    expensesPending: 0,
  };

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    fullName = profile?.full_name || user.email || "Admin";
    counts = await getSidebarCounts();
  }

  return (
    <AppShell counts={counts} fullName={fullName}>
      {children}
    </AppShell>
  );
}
