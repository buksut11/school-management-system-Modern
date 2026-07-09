import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5 flex items-center gap-4">
            <Skeleton className="w-11 h-11 rounded-2xl flex-none" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 items-start">
        <Card className="p-5 space-y-3">
          <Skeleton className="h-4 w-32 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
        <Card className="p-5 space-y-3">
          <Skeleton className="h-4 w-32 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
