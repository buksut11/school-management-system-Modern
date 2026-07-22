"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  GraduationCap,
  CalendarCheck,
  CalendarRange,
  School,
  BookOpen,
  Building2,
  ClipboardList,
  NotebookPen,
  FileBarChart,
  Wallet,
  Receipt,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";
import type { SidebarCounts } from "@/lib/data/dashboard";
import type { Role } from "@/lib/types/database";

const NAV: { href: string; label: MessageKey; icon: typeof LayoutGrid; badgeKey?: "students" | "teachers" | "attendance" | "fees" | "expenses" }[] = [
  { href: "/", label: "nav.dashboard", icon: LayoutGrid },
  { href: "/students", label: "nav.students", icon: Users, badgeKey: "students" },
  { href: "/teachers", label: "nav.teachers", icon: GraduationCap, badgeKey: "teachers" },
  { href: "/classes", label: "nav.classes", icon: School },
  { href: "/subjects", label: "nav.subjects", icon: BookOpen },
  { href: "/departments", label: "nav.departments", icon: Building2 },
  { href: "/timetable", label: "nav.timetable", icon: CalendarRange },
  { href: "/attendance", label: "nav.attendance", icon: CalendarCheck, badgeKey: "attendance" },
  { href: "/exams", label: "nav.exams", icon: ClipboardList },
  { href: "/homework", label: "nav.homework", icon: NotebookPen },
  { href: "/academic-records", label: "nav.academicRecords", icon: FileBarChart },
  { href: "/fees", label: "nav.fees", icon: Wallet, badgeKey: "fees" },
  { href: "/expenses", label: "nav.expenses", icon: Receipt, badgeKey: "expenses" },
  { href: "/invoices", label: "nav.invoices", icon: FileText },
  { href: "/messages", label: "nav.messages", icon: MessageSquare },
  { href: "/reports", label: "nav.reports", icon: BarChart3 },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

// Which pages each role can see. RLS enforces the data underneath —
// this only keeps the menu honest about what each person can do.
const ALL = NAV.map((n) => n.href);
const ROLE_NAV: Record<Role, string[]> = {
  admin: ALL,
  staff: ALL.filter((h) => h !== "/expenses"),
  finance: ["/", "/students", "/classes", "/fees", "/expenses", "/invoices", "/messages", "/reports"],
  teacher: [
    "/",
    "/students",
    "/classes",
    "/subjects",
    "/timetable",
    "/attendance",
    "/exams",
    "/homework",
    "/academic-records",
    "/reports",
  ],
  student: ["/", "/timetable", "/attendance", "/exams", "/homework", "/academic-records", "/fees", "/invoices"],
  parent: ["/", "/timetable", "/attendance", "/exams", "/homework", "/academic-records", "/fees", "/invoices"],
  pending: [],
};

export function Sidebar({
  counts,
  role,
  schoolName,
  onNavigate,
  className,
}: {
  counts: SidebarCounts;
  role: Role;
  schoolName: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const t = useT();
  const allowed = new Set(ROLE_NAV[role] ?? ALL);
  const nav = NAV.filter((item) => allowed.has(item.href));

  return (
    <aside
      className={cn(
        "flex flex-col overflow-y-auto bg-glass-side backdrop-blur-2xl backdrop-saturate-150 border-r border-line p-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-4">
        <div className="w-[34px] h-[34px] rounded-lg bg-blue text-white shadow flex items-center justify-center overflow-hidden flex-none text-[15px] font-bold">
          {schoolInitial(schoolName)}
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[13.5px] font-semibold tracking-tight line-clamp-2" title={schoolName}>
            {schoolName}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-semibold text-text-2 uppercase tracking-wide px-2.5 pb-2">
        {t("nav.section.manage")}
      </div>

      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 h-[38px] px-2.5 rounded-[10px] text-[13.5px] font-medium transition-colors",
                active ? "bg-blue text-white" : "text-text hover:bg-hover"
              )}
            >
              <Icon size={17} strokeWidth={1.8} className="flex-none" />
              <span className="flex-1 truncate">{t(item.label)}</span>
              {item.badgeKey === "students" && counts.students > 0 && (
                <Badge active={active}>{counts.students}</Badge>
              )}
              {item.badgeKey === "teachers" && counts.teachers > 0 && (
                <Badge active={active}>{counts.teachers}</Badge>
              )}
              {item.badgeKey === "fees" && counts.feesOwing > 0 && (
                <Badge active={active}>{counts.feesOwing}</Badge>
              )}
              {item.badgeKey === "expenses" && counts.expensesPending > 0 && (
                <Badge active={active}>{counts.expensesPending}</Badge>
              )}
              {item.badgeKey === "attendance" && (
                <div className="flex items-center gap-1 flex-none">
                  {counts.present > 0 && <Dot active={active} tone="#34C759" count={counts.present} />}
                  {counts.late > 0 && <Dot active={active} tone="#FF9500" count={counts.late} />}
                  {counts.absent > 0 && <Dot active={active} tone="#FF3B30" count={counts.absent} />}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// First letter/digit of the school's name, for the sidebar mark. Skips
// honorific prefixes like "Sh." so "Sh.Asharow" reads as "A".
function schoolInitial(name: string) {
  const cleaned = name.replace(/^(sh|dr|mr|mrs|ms)\.?\s*/i, "");
  const match = (cleaned || name).match(/[a-z0-9]/i);
  return match ? match[0].toUpperCase() : "S";
}

function Badge({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      className={cn(
        "h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center flex-none",
        active ? "bg-white/25 text-white" : "bg-blue-soft text-blue"
      )}
    >
      {children}
    </span>
  );
}

function Dot({ tone, count, active }: { tone: string; count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "h-5 min-w-5 px-1.5 rounded-full text-[10.5px] font-bold flex items-center justify-center",
        active && "bg-white/90"
      )}
      style={{ color: tone, background: active ? "rgba(255,255,255,0.9)" : `${tone}1a` }}
    >
      {count}
    </span>
  );
}
