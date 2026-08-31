import { Card, Skeleton } from "@/components/ui";

export default function AttemptsLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-40" />
        ))}
      </div>
      <Card className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  );
}
