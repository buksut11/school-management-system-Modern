"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Supabase isn't configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(safeNext(next));
}

export type SignupState = { error?: string; message?: string } | undefined;

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase isn't configured yet." };
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");

  if (!fullName || !email || !password) {
    return { error: "Enter your name, email and a password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
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
    return {
      message:
        "Check your email to confirm your account, then come back to this link and sign in.",
    };
  }
  redirect(safeNext(next));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
