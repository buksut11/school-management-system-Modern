"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle } from "./language-toggle";
import { Avatar } from "@/components/ui/avatar";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

const TITLES: Record<string, MessageKey> = {
  "/": "nav.dashboard",
  "/students": "nav.students",
  "/teachers": "nav.teachers",
  "/classes": "nav.classes",
  "/subjects": "nav.subjects",
  "/departments": "nav.departments",
  "/timetable": "nav.timetable",
  "/attendance": "nav.attendance",
  "/exams": "nav.exams",
  "/homework": "nav.homework",
  "/academic-records": "nav.academicRecords",
  "/fees": "nav.fees",
  "/expenses": "nav.expenses",
  "/invoices": "nav.invoices",
  "/messages": "nav.messages",
  "/reports": "nav.reports",
  "/settings": "nav.settings",
};

export function Topbar({
  fullName,
  schoolName,
  onMenuClick,
}: {
  fullName: string;
  schoolName: string;
  onMenuClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
  const titleKey =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => href !== "/" && pathname.startsWith(href))?.[1];
  const title = titleKey ? t(titleKey) : schoolName;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 h-16 px-4 sm:px-6 bg-glass backdrop-blur-2xl backdrop-saturate-150 border-b border-line">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="w-9 h-9 rounded-full flex items-center justify-center text-text hover:bg-hover md:hidden flex-none"
          aria-label={t("common.openMenu")}
        >
          <Menu size={19} />
        </button>
        <h1 className="text-[16px] sm:text-[18px] font-semibold tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 flex-none">
        <LanguageToggle />
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-1 h-9 rounded-full hover:bg-hover transition-colors"
          >
            <Avatar name={fullName || "Admin"} size={30} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-48 rounded-2xl bg-solid border border-line shadow-card-lg p-1.5 animate-pop-in">
                <div className="px-2.5 py-2 text-[13px] font-medium truncate">{fullName || "Admin"}</div>
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-2.5 h-9 rounded-lg text-[13px] text-red hover:bg-red/10 transition-colors"
                  >
                    <LogOut size={15} /> {t("common.signOut")}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
