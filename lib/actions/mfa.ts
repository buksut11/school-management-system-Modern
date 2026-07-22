"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// Two-factor authentication (TOTP) — opt-in per user. A user turns it on
// in Settings → Security; from then on they enter a 6-digit code from
// their authenticator app after their password. Enforcement of the code
// happens in two places: the login form (the normal path) and the app
// layout (a safety net, so an already-issued password-only session can't
// reach the app while a verified factor exists).

export type EnrollResult = { error: string } | { factorId: string; qrCode: string; secret: string };

// Whether the signed-in user has an active (verified) authenticator.
// listFactors().totp holds only verified factors.
export async function getMfaState(): Promise<{ enabled: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return { enabled: (data?.totp ?? []).length > 0 };
}

// Begin enrollment: returns a QR code + secret for the authenticator app.
// Any half-finished factor from an abandoned earlier attempt is cleared
// first so they don't accumulate.
export async function startMfaEnrollment(): Promise<EnrollResult> {
  const supabase = await createClient();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) return { error: "Couldn't start two-factor setup. Please try again." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

// Confirm enrollment with the first code from the app. On success the
// factor becomes active and the current session is upgraded to AAL2.
export async function confirmMfaEnrollment(
  factorId: string,
  code: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const clean = code.replace(/\D/g, "");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: clean });
  if (error) {
    return { error: "That code didn't match. Check your authenticator app and try again." };
  }
  return { success: true };
}

// Turn two-factor off: remove every authenticator on the account.
export async function disableMfa(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.totp ?? []) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) return { error: "Couldn't turn off two-factor. Please try again." };
  }
  return { success: true };
}

export type MfaChallengeState = { error?: string } | undefined;

// The in-app gate's code step (see components/onboarding/mfa-challenge).
// Verifying here upgrades the session to AAL2; the caller then reloads and
// the layout gate lets them through.
export async function verifyMfaChallenge(
  _prev: MfaChallengeState,
  formData: FormData
): Promise<MfaChallengeState> {
  const code = String(formData.get("code") || "").replace(/\D/g, "");
  if (!code) return { error: "Enter the 6-digit code." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) return { error: "No authenticator is set up on this account." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
  if (error) return { error: "That code didn't match. Try again." };
  redirect("/");
}

// The login form's code step, used right after the password when the
// account has two-factor enabled. Redirects on into the app on success.
export async function verifyLoginMfa(
  _prev: MfaChallengeState,
  formData: FormData
): Promise<MfaChallengeState> {
  const code = String(formData.get("code") || "").replace(/\D/g, "");
  const next = safeNext(String(formData.get("next") || "/"));
  if (!code) return { error: "Enter the 6-digit code." };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) return { error: "No authenticator is set up on this account." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
  if (error) return { error: "That code didn't match. Try again." };
  redirect(next);
}
