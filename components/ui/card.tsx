import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card backdrop-blur-2xl backdrop-saturate-150 border border-line shadow-card",
        className
      )}
      {...props}
    />
  );
}
