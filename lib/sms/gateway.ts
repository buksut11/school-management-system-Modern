// Pluggable SMS gateways for the notifications outbox (migration 0040).
// Server-side only — every credential lives in non-public env vars, and
// gateway calls happen from server actions / route handlers (the
// browser CSP never sees these hosts).
//
// Select with SMS_PROVIDER:
//   twilio          TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//                   (a phone number, or a Messaging Service SID)
//   africastalking  AT_USERNAME, AT_API_KEY, AT_FROM (optional sender id)
//   http            a generic JSON/form POST for local gateways
//                   (Hormuud, Somtel, …): SMS_HTTP_URL,
//                   SMS_HTTP_HEADERS (JSON object, optional),
//                   SMS_HTTP_BODY (template with {to} and {message})
// Unset -> no gateway; the Messages page's CSV workflow still works.

export type SendResult = { ok: boolean; error?: string };

export type SmsGateway = {
  name: string;
  send: (to: string, body: string) => Promise<SendResult>;
};

function failure(error: unknown): SendResult {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Send failed";
  return { ok: false, error: message.slice(0, 300) };
}

function twilioGateway(): SmsGateway | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return null;
  return {
    name: "Twilio",
    async send(to, body) {
      try {
        const params = new URLSearchParams({ To: to, Body: body });
        // A Messaging Service SID starts with "MG"; otherwise it's a number.
        params.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          }
        );
        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as { message?: string } | null;
          return failure(detail?.message ?? `Twilio responded ${res.status}`);
        }
        return { ok: true };
      } catch (e) {
        return failure(e);
      }
    },
  };
}

function africasTalkingGateway(): SmsGateway | null {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return null;
  return {
    name: "Africa's Talking",
    async send(to, body) {
      try {
        const params = new URLSearchParams({ username, to, message: body });
        if (process.env.AT_FROM) params.set("from", process.env.AT_FROM);
        const res = await fetch("https://api.africastalking.com/version1/messaging", {
          method: "POST",
          headers: {
            apiKey,
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        const data = (await res.json().catch(() => null)) as {
          SMSMessageData?: { Recipients?: { status?: string }[] };
        } | null;
        const status = data?.SMSMessageData?.Recipients?.[0]?.status;
        if (!res.ok || (status && status !== "Success")) {
          return failure(status ?? `Africa's Talking responded ${res.status}`);
        }
        return { ok: true };
      } catch (e) {
        return failure(e);
      }
    },
  };
}

function httpGateway(): SmsGateway | null {
  const url = process.env.SMS_HTTP_URL;
  const bodyTemplate = process.env.SMS_HTTP_BODY;
  if (!url || !bodyTemplate) return null;
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.SMS_HTTP_HEADERS) {
    try {
      headers = { ...headers, ...JSON.parse(process.env.SMS_HTTP_HEADERS) };
    } catch {
      return null; // malformed config: treat as unconfigured rather than send garbage
    }
  }
  return {
    name: "HTTP gateway",
    async send(to, body) {
      try {
        // JSON.stringify-ing the values keeps the template valid whether
        // it's a JSON body ("to": {to}) or a query-ish string.
        const payload = bodyTemplate
          .replaceAll("{to}", JSON.stringify(to).slice(1, -1))
          .replaceAll("{message}", JSON.stringify(body).slice(1, -1));
        const res = await fetch(url, { method: "POST", headers, body: payload });
        if (!res.ok) return failure(`Gateway responded ${res.status}`);
        return { ok: true };
      } catch (e) {
        return failure(e);
      }
    },
  };
}

export function getGateway(): SmsGateway | null {
  switch (process.env.SMS_PROVIDER) {
    case "twilio":
      return twilioGateway();
    case "africastalking":
      return africasTalkingGateway();
    case "http":
      return httpGateway();
    default:
      return null;
  }
}

// What the Messages page shows: the gateway's display name, or null when
// delivery is manual (CSV export).
export function gatewayName(): string | null {
  return getGateway()?.name ?? null;
}
