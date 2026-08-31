import { Card, Skeleton } from "@/components/ui";

export default function AttemptDetailLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-2 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-10 w-full" />
      </Card>
      <Card className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </Card>
    </div>
  );
}
