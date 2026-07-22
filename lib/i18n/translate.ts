import type { Locale } from "./config";
import { messages, type MessageKey } from "./messages";

export type TranslateVars = Record<string, string | number>;
export type TFunction = (key: MessageKey, vars?: TranslateVars) => string;

// Pure lookup with {brace} interpolation — no server/client imports, so
// both environments share it. Falls back to English, then the key itself.
export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  let s = messages[locale]?.[key] ?? messages.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}
