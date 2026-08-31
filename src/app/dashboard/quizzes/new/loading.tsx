import { Card, Skeleton } from "@/components/ui";

export default function NewQuizLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Skeleton className="h-8 w-40" />
      <Card className="max-w-2xl space-y-4 p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-11 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </Card>
    </div>
  );
}
