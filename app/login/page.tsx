import Image from "next/image";
import { AmbientBackground } from "@/components/layout/ambient-bg";
import { LoginForm } from "./login-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card-lg p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden mb-4">
            <Image
              src="/brand/school-logo.jpg"
              alt="Sh.Asharow School logo"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight">Sh.Asharow</h1>
          <p className="text-[13px] text-text-2">Primary &amp; Secondary School</p>
        </div>

        {!isSupabaseConfigured && (
          <p className="text-[13px] text-orange bg-orange/10 rounded-lg px-3 py-2 mb-4">
            Supabase isn&apos;t configured yet — add your project URL and anon key to{" "}
            <code>.env.local</code> to enable sign-in.
          </p>
        )}

        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
