import { Card, Skeleton } from "@/components/ui";

export default function QuizStartLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <Card className="space-y-4 p-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-40" />
      </Card>
    </div>
  );
}
