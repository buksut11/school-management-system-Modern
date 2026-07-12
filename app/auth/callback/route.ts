import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// Completes email-link sign-in (recovery, confirmation, magic link).
// This has to be a Route Handler — Server Components can't set the
// session cookies that verification produces.
//
// Two link styles arrive here:
//   • ?token_hash=...&type=recovery — self-contained links from the
//     email templates. These verify on ANY device or browser, which
//     matters because people routinely request a reset on one device
//     and open the email on another.
//   • ?code=... — PKCE codes. These only redeem in the same browser
//     that started the flow (the secret half lives in its cookies), so
//     they're kept as a fallback, not the primary path.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next") ?? "/");

  const failure = () => {
    // Expired or already-used link: land on login with a hint rather
    // than a dead end — the account may well be confirmed already.
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", next);
    login.searchParams.set("notice", "link-expired");
    return NextResponse.redirect(login);
  };

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure();
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure();
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
