import { Card, Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-2 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Card className="space-y-3 p-5">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-10 w-32" />
        </Card>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Card className="p-5">
          <Skeleton className="h-56 w-full" />
        </Card>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-36" />
        <Card className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      </div>
    </div>
  );
}
