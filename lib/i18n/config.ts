// Somali + English. Both are Latin-script and left-to-right, so there's
// no RTL handling — a locale is just which dictionary the t() helpers read.
export const LOCALES = ["en", "so"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

// Shown in the language switcher (each in its own language).
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  so: "Soomaali",
};

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "so";
}
