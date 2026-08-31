import { Card, Skeleton } from "@/components/ui";

export default function GenerateLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <Card className="max-w-2xl space-y-4 p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-32" />
        <Skeleton className="h-10 w-40" />
      </Card>
    </div>
  );
}
