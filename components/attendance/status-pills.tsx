"use client";

import { cn } from "@/lib/utils";

const OPTIONS: { value: "present" | "late" | "absent"; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "var(--green)" },
  { value: "late", label: "Late", color: "var(--orange)" },
  { value: "absent", label: "Absent", color: "var(--red)" },
];

export function StatusPills({
  value,
  onChange,
  disabled,
}: {
  value: "present" | "late" | "absent";
  onChange: (v: "present" | "late" | "absent") => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-card-2 p-1 gap-1">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-7 px-2.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
            )}
            style={{
              background: active ? opt.color : "transparent",
              color: active ? "#fff" : "var(--text-2)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
