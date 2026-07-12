"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AmbientBackground } from "./ambient-bg";
import type { SidebarCounts } from "@/lib/data/dashboard";
import type { Role } from "@/lib/types/database";

export function AppShell({
  counts,
  fullName,
  role,
  children,
}: {
  counts: SidebarCounts;
  fullName: string;
  role: Role;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex">
      <AmbientBackground />

      <Sidebar counts={counts} role={role} className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-[248px] z-10" />

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <Sidebar
        counts={counts}
        role={role}
        onNavigate={() => setDrawerOpen(false)}
        className={`fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[300px] md:hidden transition-transform duration-300 ${
          drawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      />

      <div className="relative z-[1] flex-1 min-w-0 flex flex-col">
        <Topbar fullName={fullName} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
