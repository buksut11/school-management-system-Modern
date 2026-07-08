import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-card-2", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex flex-wrap items-center gap-2.5">
        <Skeleton className="h-10 flex-1 min-w-[200px]" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-2xl border border-line overflow-hidden">
        <div className="divide-y divide-line/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="w-8 h-8 rounded-full flex-none" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20 flex-none" />
              <Skeleton className="h-4 w-16 flex-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
