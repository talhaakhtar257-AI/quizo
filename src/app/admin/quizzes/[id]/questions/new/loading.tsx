import { Card, Skeleton } from "@/components/ui";

export default function NewQuestionLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Skeleton className="h-8 w-40" />
      <Card className="max-w-2xl space-y-4 p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
        <Skeleton className="h-10 w-32" />
      </Card>
    </div>
  );
}
