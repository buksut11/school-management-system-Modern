"use client";

import { useState, useTransition } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { setLocale } from "@/lib/actions/locale";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const locale = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function choose(next: string) {
    setOpen(false);
    if (next === locale) return;
    start(() => setLocale(next));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text hover:bg-hover transition-colors"
        aria-label={t("common.changeLanguage")}
      >
        <Globe size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-40 rounded-2xl bg-solid border border-line shadow-card-lg p-1.5 animate-pop-in">
            {LOCALES.map((code) => (
              <button
                key={code}
                onClick={() => choose(code)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 h-9 rounded-lg text-[13px] hover:bg-hover transition-colors",
                  code === locale && "font-semibold"
                )}
              >
                {LOCALE_LABELS[code]}
                {code === locale && <Check size={14} className="text-blue" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
