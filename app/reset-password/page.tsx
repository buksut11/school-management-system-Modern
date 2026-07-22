import { AmbientBackground } from "@/components/layout/ambient-bg";
import { getT } from "@/lib/i18n/server";
import { ResetPasswordForm } from "./reset-form";

// Deliberately no server-side auth gate: the recovery link's tokens live
// in the URL fragment, which the server never sees — the client
// component below establishes the session and renders the form (or an
// expired-link message).
export default async function ResetPasswordPage() {
  const t = await getT();
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <AmbientBackground />
      <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card-lg p-8">
        <h1 className="text-[17px] font-semibold tracking-tight mb-4">{t("reset.title")}</h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
