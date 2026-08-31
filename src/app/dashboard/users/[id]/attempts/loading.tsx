import { Card, Skeleton } from "@/components/ui";

export default function UserAttemptsLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-2 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-56 w-full" />
      </Card>
      <Card className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  );
}
