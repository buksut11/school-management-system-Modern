"use client";

import { useActionState, useState } from "react";
import { login, signup, requestPasswordReset } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [state, formAction, pending] = useActionState(login, undefined);
  const [signupState, signupAction, signingUp] = useActionState(signup, undefined);
  const [forgotState, forgotAction, sendingReset] = useActionState(requestPasswordReset, undefined);

  if (mode === "forgot") {
    return (
      <form action={forgotAction} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </div>
        {forgotState?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{forgotState.error}</p>
        )}
        {forgotState?.message && (
          <p className="text-[13px] text-green bg-green/10 rounded-lg px-3 py-2">{forgotState.message}</p>
        )}
        <Button type="submit" disabled={sendingReset} className="w-full">
          {sendingReset ? "Sending…" : "Send reset link"}
        </Button>
        <p className="text-[12.5px] text-text-2 text-center">
          Remembered it?{" "}
          <button type="button" onClick={() => setMode("login")} className="text-blue hover:underline">
            Sign in
          </button>
        </p>
      </form>
    );
  }

  if (mode === "signup") {
    return (
      <form action={signupAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" placeholder="Your name" autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" required />
        </div>
        {signupState?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{signupState.error}</p>
        )}
        {signupState?.message && (
          <p className="text-[13px] text-green bg-green/10 rounded-lg px-3 py-2">{signupState.message}</p>
        )}
        <Button type="submit" disabled={signingUp} className="w-full">
          {signingUp ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-[12.5px] text-text-2 text-center">
          Already have an account?{" "}
          <button type="button" onClick={() => setMode("login")} className="text-blue hover:underline">
            Sign in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@shasharow.edu" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-[12.5px] text-text-2 text-center">
        Invited to a school?{" "}
        <button type="button" onClick={() => setMode("signup")} className="text-blue hover:underline">
          Create an account
        </button>
        {" · "}
        <button type="button" onClick={() => setMode("forgot")} className="text-blue hover:underline">
          Forgot password?
        </button>
      </p>
    </form>
  );
}
