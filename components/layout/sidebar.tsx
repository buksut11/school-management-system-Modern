"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  GraduationCap,
  CalendarCheck,
  School,
  BookOpen,
  Building2,
  ClipboardList,
  FileBarChart,
  Wallet,
  Receipt,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarCounts } from "@/lib/data/dashboard";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/students", label: "Students", icon: Users, badgeKey: "students" as const },
  { href: "/teachers", label: "Teachers", icon: GraduationCap, badgeKey: "teachers" as const },
  { href: "/classes", label: "Classes", icon: School },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, badgeKey: "attendance" as const },
  { href: "/exams", label: "Exams & Grades", icon: ClipboardList },
  { href: "/academic-records", label: "Academic Records", icon: FileBarChart },
  { href: "/fees", label: "Fees", icon: Wallet, badgeKey: "fees" as const },
  { href: "/expenses", label: "Expenses", icon: Receipt, badgeKey: "expenses" as const },
  { href: "/invoices", label: "Invoices & Receipts", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Data & Settings", icon: Settings },
];

export function Sidebar({
  counts,
  onNavigate,
  className,
}: {
  counts: SidebarCounts;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col overflow-y-auto bg-glass-side backdrop-blur-2xl backdrop-saturate-150 border-r border-line p-3",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-4">
        <div className="w-[34px] h-[34px] rounded-lg bg-white shadow flex items-center justify-center overflow-hidden flex-none">
          <Image src="/brand/school-logo.jpg" alt="" width={34} height={34} className="object-contain" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[13.5px] font-semibold tracking-tight truncate">Sh.Asharow</div>
          <div className="text-[10.5px] text-text-2 font-medium truncate">
            Primary &amp; Secondary School
          </div>
        </div>
      </div>

      <div className="text-[11px] font-semibold text-text-2 uppercase tracking-wide px-2.5 pb-2">
        Manage
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
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
              <span className="flex-1 truncate">{item.label}</span>
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
