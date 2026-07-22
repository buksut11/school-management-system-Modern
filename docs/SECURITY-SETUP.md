# Security setup

Two kinds of protection guard sign-in: things built into this app (in the
code, already working) and things you switch on in the **Supabase
dashboard** (a few clicks, no code). This page covers both.

---

## 1. Two-factor authentication (2FA) — built in ✅

Any user can turn on 2FA under **Settings → Security**. They scan a QR
code with an authenticator app (Google Authenticator, Authy, Microsoft
Authenticator), and from then on they enter a 6-digit code after their
password.

- It's **opt-in**: no one is forced to use it, but **admin and finance
  accounts are strongly encouraged to** — those accounts control money and
  personal data, so a stolen password there is the biggest risk.
- Once a user enables it, the code is required both at the login screen and
  if they try to open the app directly — a password alone won't get in.

### If someone gets locked out

There is **no self-service "lost my phone" reset yet**. If a user loses
their authenticator, an administrator can clear it for them using Supabase:

1. Supabase dashboard → **Authentication → Users**.
2. Open the affected user.
3. Remove their MFA factor (or delete and re-invite as a last resort).

If you'd like a proper in-app "reset a member's 2FA" button for admins,
that's a small follow-up — ask and it can be added.

---

## 2. Rate limiting — Supabase dashboard

Supabase already limits how many times someone can try to sign in, sign
up, or request emails from a single source, which blunts password-guessing
and spam. Review and tighten these:

**Dashboard → Authentication → Rate Limits**

| Limit | Suggested | Why |
|-------|-----------|-----|
| Sign in / sign up | Lower than the default if you have few users | Slows password guessing |
| Token refreshes | Leave default | |
| Emails sent per hour | Keep modest | Stops reset-email spam |

The exact fields depend on your Supabase plan; the goal is simply to keep
them **as low as your real usage allows**.

---

## 3. CAPTCHA on sign-up — Supabase dashboard

Because sign-up is open (anyone can create an account, then wait to be
linked to a school), it's worth adding a CAPTCHA so bots can't flood you
with junk accounts.

**Dashboard → Authentication → Settings → Enable Captcha protection**

1. Choose a provider (hCaptcha or Cloudflare Turnstile) and create a free
   site there to get a **site key** and **secret**.
2. Paste the secret into Supabase and save.
3. The app's login/sign-up forms need the matching site key wired in — this
   is a small code change; ask for it once you have the key and it can be
   added (it also needs the provider allowed in the site's content-security
   policy).

---

## 4. Block leaked passwords — Supabase dashboard (quick win)

Supabase can reject passwords that have appeared in known data breaches.

**Dashboard → Authentication → Settings → Password security** → turn on
**"Prevent use of leaked passwords."**

The app already requires at least 8 characters; you can raise the minimum
length in the same section if you want.

---

## Summary

| Protection | Where | Status |
|------------|-------|--------|
| Two-factor authentication | In the app (Settings → Security) | ✅ built |
| Auth rate limits | Supabase dashboard | ⚙️ review settings |
| CAPTCHA on sign-up | Supabase dashboard + small code hook | ⚙️ optional |
| Block leaked passwords | Supabase dashboard | ⚙️ one toggle |
