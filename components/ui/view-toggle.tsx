"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

export function ViewToggle({
  view,
  onChange,
  className,
}: {
  view: "list" | "grid";
  onChange: (v: "list" | "grid") => void;
  className?: string;
}) {
  const t = useT();
  return (
    <div
      className={cn(
        "view-toggle inline-flex items-center rounded-xl bg-card-2 p-1 gap-1",
        className
      )}
    >
      <button
        onClick={() => onChange("list")}
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          view === "list" ? "bg-solid shadow-sm text-blue" : "text-text-2 hover:text-text"
        )}
        aria-label={t("common.listView")}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => onChange("grid")}
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          view === "grid" ? "bg-solid shadow-sm text-blue" : "text-text-2 hover:text-text"
        )}
        aria-label={t("common.gridView")}
      >
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}
