import { Card, Skeleton } from "@/components/ui";

export default function CoursesLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  );
}
