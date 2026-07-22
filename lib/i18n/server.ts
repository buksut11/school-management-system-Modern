import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { translate, type TFunction } from "./translate";

// The caller's locale, from the cookie the switcher sets. Used by server
// components and the root layout (which stamps <html lang>).
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return isLocale(store.get(LOCALE_COOKIE)?.value) ? (store.get(LOCALE_COOKIE)!.value as Locale) : DEFAULT_LOCALE;
}

// A bound t() for server components: `const t = await getT();`
export async function getT(): Promise<TFunction> {
  const locale = await getLocale();
  return (key, vars) => translate(locale, key, vars);
}
