import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSidebarCounts, type SidebarCounts } from "@/lib/data/dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { SchoolOnboarding } from "@/components/onboarding/school-onboarding";

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
      .select("full_name, school_id")
      .eq("id", user.id)
      .single();

    fullName = profile?.full_name || user.email || "Admin";

    // Multi-tenant gate: a signed-in user without a school sees the
    // create/join onboarding instead of an empty app.
    if (!profile?.school_id) {
      return <SchoolOnboarding fullName={profile?.full_name || ""} />;
    }

    counts = await getSidebarCounts();
  }

  return (
    <AppShell counts={counts} fullName={fullName}>
      {children}
    </AppShell>
  );
}
