import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { AmbientBackground } from "@/components/layout/ambient-bg";
import { LoginForm } from "./login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; code?: string; notice?: string; mode?: string }>;
}) {
  const { next, code, notice, mode } = await searchParams;

  // An email confirmation link can land here carrying its one-time code
  // (Supabase redirects to the Site URL root; the middleware bounces
  // signed-out visitors to /login with the query intact). Forward it to
  // the callback that can actually exchange it for a session.
  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(safeNext(next ?? "/"))}`
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card-lg p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue text-white shadow-md flex items-center justify-center mb-4">
            <GraduationCap size={28} strokeWidth={1.8} />
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight">School Management System</h1>
          <p className="text-[13px] text-text-2">Sign in to your account</p>
        </div>

        {notice === "link-expired" && (
          <p className="text-[13px] text-orange bg-orange/10 rounded-lg px-3 py-2 mb-4">
            That email link has expired or was already used. If you&apos;ve confirmed your
            account, just sign in below.
          </p>
        )}
        {!isSupabaseConfigured && (
          <p className="text-[13px] text-orange bg-orange/10 rounded-lg px-3 py-2 mb-4">
            Supabase isn&apos;t configured yet — add your project URL and anon key to{" "}
            <code>.env.local</code> to enable sign-in.
          </p>
        )}

        <LoginForm next={next ?? "/"} initialMode={mode === "signup" ? "signup" : "login"} />
      </div>
    </div>
  );
}
