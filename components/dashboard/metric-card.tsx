import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "blue" | "purple" | "green" | "orange";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-soft text-blue",
    purple: "bg-purple/10 text-purple",
    green: "bg-green/10 text-green",
    orange: "bg-orange/10 text-orange",
  };

  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-none", tones[tone])}>
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="text-[22px] font-semibold tracking-tight leading-tight">{value}</div>
        <div className="text-[13px] text-text-2 truncate">{label}</div>
      </div>
    </Card>
  );
}
