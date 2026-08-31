import { Card, Skeleton } from "@/components/ui";

export default function HistoryLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <Card className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </Card>
    </div>
  );
}
