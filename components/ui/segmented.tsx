"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-xl bg-card-2 p-1 gap-1", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-8 px-3 rounded-lg text-[13px] font-medium transition-all",
            value === opt.value
              ? "bg-solid shadow-sm text-text"
              : "text-text-2 hover:text-text"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
