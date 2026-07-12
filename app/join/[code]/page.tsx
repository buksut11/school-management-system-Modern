import Link from "next/link";
import { redirect } from "next/navigation";
import { AmbientBackground } from "@/components/layout/ambient-bg";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { JoinCard } from "./join-card";

// Invite landing page. The middleware bounces signed-out visitors to
// /login (in create-account mode) with ?next= back here, so by the time
// this renders we have a user; what's left is whether they already
// belong to a school and whether the invite is still good.
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?mode=signup&next=${encodeURIComponent(`/join/${code}`)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  const { data: info } = await supabase.rpc("invite_info", { p_code: code });

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card-lg p-8">
        {profile?.school_id ? (
          <div className="text-center space-y-3">
            <h1 className="text-[17px] font-semibold tracking-tight">
              You already belong to a school
            </h1>
            <p className="text-[13px] text-text-2">
              This invite is for new accounts. Yours is already a member of a school, so
              there&apos;s nothing to join.
            </p>
            <Link
              href="/"
              className="inline-block text-[13.5px] font-medium text-blue hover:underline"
            >
              Go to your dashboard →
            </Link>
          </div>
        ) : (
          <JoinCard
            code={code}
            valid={Boolean(info?.valid)}
            schoolName={info?.school_name ?? null}
            role={info?.role ?? null}
            reason={info?.reason ?? null}
          />
        )}
      </div>
    </div>
  );
}
