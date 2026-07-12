import { redirect } from "next/navigation";
import { AmbientBackground } from "@/components/layout/ambient-bg";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-form";

// The session check must run per-request, never at build time.
export const dynamic = "force-dynamic";

// Where the recovery email lands (via /auth/callback, which has already
// exchanged the one-time code for a session). The middleware bounces
// signed-out visitors to /login, so an expired link never dead-ends here.
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?notice=link-expired");

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card-lg p-8">
        <h1 className="text-[17px] font-semibold tracking-tight mb-1">Set a new password</h1>
        <p className="text-[13px] text-text-2 mb-5">
          for <span className="font-medium text-text">{user.email}</span>
        </p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
