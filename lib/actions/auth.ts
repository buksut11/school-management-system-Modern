"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient as createBareClient } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { safeNext } from "@/lib/utils";

export type LoginState = { error?: string; mfaRequired?: boolean; next?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const t = await getT();
  if (!isSupabaseConfigured) {
    return { error: t("err.supabaseNotConfiguredLong") };
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    return { error: t("err.enterEmailPassword") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // If this account has two-factor enabled, the password only gets them to
  // AAL1 — hand off to the code step instead of completing the sign-in.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal2") {
    return { mfaRequired: true, next: safeNext(next) };
  }

  redirect(safeNext(next));
}

export type SignupState = { error?: string; message?: string } | undefined;

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const t = await getT();
  if (!isSupabaseConfigured) {
    return { error: t("err.supabaseNotConfigured") };
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!fullName || !email || !password) {
    return { error: t("err.enterNameEmailPassword") };
  }
  if (password.length < 8) {
    return { error: t("err.passwordMin8") };
  }

  // The confirmation email must link back to THIS deployment's callback,
  // not the Supabase project's default Site URL (which is localhost until
  // configured). The domain still has to be in the project's Redirect
  // URLs allowlist for Supabase to honor it.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const callback = host
    ? `${proto}://${host}/auth/callback?next=${encodeURIComponent(safeNext(next))}`
    : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: callback },
  });
  if (error) return { error: error.message };

  // With email confirmation enabled there's no session yet; with it
  // disabled the user is signed in and lands wherever they were headed
  // (the invite link they clicked, or the school onboarding).
  if (!data.session) {
    return { message: t("ok.checkEmailConfirm") };
  }
  redirect(safeNext(next));
}

export async function requestPasswordReset(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const t = await getT();
  if (!isSupabaseConfigured) {
    return { error: t("err.supabaseNotConfigured") };
  }
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: t("err.enterEmail") };

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";

  // A bare implicit-flow client on purpose (not the cookie-bound PKCE
  // one): the default email template's link then carries the recovery
  // session in the URL itself, so it works from ANY device or browser —
  // PKCE reset links only redeem in the browser that requested them,
  // and fixing that the other way needs an email-template edit.
  const bare = createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } }
  );
  // Errors are not surfaced per address — that would let anyone probe
  // which emails have accounts.
  await bare.auth.resetPasswordForEmail(email, {
    redirectTo: host ? `${proto}://${host}/reset-password` : undefined,
  });
  return { message: t("ok.resetLinkSent") };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
