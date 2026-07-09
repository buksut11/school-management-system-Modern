import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-4 max-w-6xl">
      <Skeleton className="h-10 w-64" />
      <Card className="p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-44 w-full" />
      </Card>
      <Card className="p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-44 w-full" />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </Card>
        <Card className="p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
