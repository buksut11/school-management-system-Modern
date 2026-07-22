"use client";

import { useActionState, useState } from "react";
import { login, signup, requestPasswordReset } from "@/lib/actions/auth";
import { verifyLoginMfa } from "@/lib/actions/mfa";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function LoginForm({
  next,
  initialMode = "login",
}: {
  next: string;
  initialMode?: "login" | "signup";
}) {
  const t = useT();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [state, formAction, pending] = useActionState(login, undefined);
  const [signupState, signupAction, signingUp] = useActionState(signup, undefined);
  const [forgotState, forgotAction, sendingReset] = useActionState(requestPasswordReset, undefined);
  const [mfaState, mfaAction, verifyingMfa] = useActionState(verifyLoginMfa, undefined);

  // After a correct password, an account with 2FA lands here to enter the
  // 6-digit code from its authenticator app.
  if (state?.mfaRequired) {
    return (
      <form action={mfaAction} className="space-y-4">
        <input type="hidden" name="next" value={state.next ?? next} />
        <div>
          <Label htmlFor="code">{t("auth.mfaCode")}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            autoFocus
            required
          />
          <p className="mt-1.5 text-[12px] text-text-2">{t("auth.mfaHint")}</p>
        </div>
        {mfaState?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{mfaState.error}</p>
        )}
        <Button type="submit" disabled={verifyingMfa} className="w-full">
          {verifyingMfa ? t("auth.verifying") : t("auth.verifyAndSignIn")}
        </Button>
      </form>
    );
  }

  if (mode === "forgot") {
    return (
      <form action={forgotAction} className="space-y-4">
        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </div>
        {forgotState?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{forgotState.error}</p>
        )}
        {forgotState?.message && (
          <p className="text-[13px] text-green bg-green/10 rounded-lg px-3 py-2">{forgotState.message}</p>
        )}
        <Button type="submit" disabled={sendingReset} className="w-full">
          {sendingReset ? t("auth.sending") : t("auth.sendReset")}
        </Button>
        <p className="text-[12.5px] text-text-2 text-center">
          {t("auth.rememberedIt")}{" "}
          <button type="button" onClick={() => setMode("login")} className="text-blue hover:underline">
            {t("auth.signIn")}
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
          <Label htmlFor="full_name">{t("auth.fullName")}</Label>
          <Input id="full_name" name="full_name" placeholder="Your name" autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" required />
        </div>
        {signupState?.error && (
          <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{signupState.error}</p>
        )}
        {signupState?.message && (
          <p className="text-[13px] text-green bg-green/10 rounded-lg px-3 py-2">{signupState.message}</p>
        )}
        <Button type="submit" disabled={signingUp} className="w-full">
          {signingUp ? t("auth.creatingAccount") : t("auth.createAccount")}
        </Button>
        <p className="text-[12.5px] text-text-2 text-center">
          {t("auth.alreadyHaveAccount")}{" "}
          <button type="button" onClick={() => setMode("login")} className="text-blue hover:underline">
            {t("auth.signIn")}
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p className="text-[13px] text-red bg-red/10 rounded-lg px-3 py-2">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      <p className="text-[12.5px] text-text-2 text-center">
        {t("auth.invitedPrompt")}{" "}
        <button type="button" onClick={() => setMode("signup")} className="text-blue hover:underline">
          {t("auth.createAccount")}
        </button>
        {" · "}
        <button type="button" onClick={() => setMode("forgot")} className="text-blue hover:underline">
          {t("auth.forgotPassword")}
        </button>
      </p>
    </form>
  );
}
