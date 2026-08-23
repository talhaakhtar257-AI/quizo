import { Card, Skeleton } from "@/components/ui";

export default function AssignQuizLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Skeleton className="h-8 w-48" />
      <Card className="p-5">
        <Skeleton className="h-16 w-full" />
      </Card>
      <Card className="space-y-3 p-5">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    </div>
  );
}
