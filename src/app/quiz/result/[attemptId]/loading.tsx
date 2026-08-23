import { Card, Skeleton } from "@/components/ui";

export default function QuizResultLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <Card className="flex flex-col items-center gap-3 p-8">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-48" />
      </Card>
      <Card className="space-y-3 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </Card>
    </div>
  );
}
