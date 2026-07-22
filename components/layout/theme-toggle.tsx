"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-text-2 hover:bg-hover hover:text-text transition-colors",
        className
      )}
      aria-label={t("common.toggleTheme")}
    >
      <Moon size={17} className="hidden dark:block" />
      <Sun size={17} className="dark:hidden" />
    </button>
  );
}
