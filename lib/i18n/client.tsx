"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { translate, type TFunction } from "./translate";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

// Provided once by the app shell (seeded from the server-read cookie) so
// every client component can translate without prop-drilling the locale.
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// `const t = useT();` then `t("nav.students")`.
export function useT(): TFunction {
  const locale = useContext(LocaleContext);
  return useMemo<TFunction>(() => (key, vars) => translate(locale, key, vars), [locale]);
}
