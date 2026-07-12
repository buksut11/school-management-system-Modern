import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// Completes email-link sign-in (confirmation, recovery, magic link).
// Supabase redirects here with a one-time ?code= which must be exchanged
// for a session. This has to be a Route Handler — Server Components
// can't set the session cookies the exchange produces.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next") ?? "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Expired or already-used link: land on login with a hint rather
      // than a dead end — the account may well be confirmed already.
      const login = new URL("/login", url.origin);
      login.searchParams.set("next", next);
      login.searchParams.set("notice", "link-expired");
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
