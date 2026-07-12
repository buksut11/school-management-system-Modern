"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// The recovery email's link lands here with the session tokens in the
// URL FRAGMENT (#access_token=...), which never reaches the server — so
// this whole flow runs in the browser: pick up the tokens, establish the
// session, then update the password. Also covers arriving with an
// existing session (e.g. via /auth/callback token links).
export function ResetPasswordForm() {
  // created lazily in the browser only — constructing it during server
  // prerender would demand env vars the build machine may not have
  const clientRef = useRef<SupabaseClient<Database> | null>(null);
  const getSupabase = () => (clientRef.current ??= createClient());
  const router = useRouter();
  const [stage, setStage] = useState<"checking" | "ready" | "invalid">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await getSupabase().auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // scrub the tokens from the address bar either way
        window.history.replaceState(null, "", window.location.pathname);
        if (!sessionError && data.user) {
          setEmail(data.user.email ?? null);
          setStage("ready");
          return;
        }
        setStage("invalid");
        return;
      }

      if (hash.get("error_description") || hash.get("error")) {
        setStage("invalid");
        return;
      }

      // no tokens in the URL — maybe already signed in (token_hash path)
      const {
        data: { user },
      } = await getSupabase().auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
        setStage("ready");
      } else {
        setStage("invalid");
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (stage === "checking") {
    return <p className="text-[13px] text-text-2">Checking your reset link…</p>;
  }

  if (stage === "invalid") {
    return (
      <div className="text-center space-y-3">
        <AlertTriangle size={24} className="mx-auto text-orange" />
        <p className="text-[13px] text-text-2">
          This reset link has expired or was already used. Request a new one from the sign-in
          page — each link works once.
        </p>
        <Link href="/login" className="inline-block text-[13.5px] font-medium text-blue hover:underline">
          Back to sign in →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {email && (
        <p className="text-[13px] text-text-2 -mt-2">
          for <span className="font-medium text-text">{email}</span>
        </p>
      )}
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="confirm">Repeat it</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Same password again"
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
