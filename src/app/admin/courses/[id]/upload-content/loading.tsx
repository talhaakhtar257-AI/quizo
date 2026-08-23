import { Card, Skeleton } from "@/components/ui";

export default function UploadContentLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card className="p-6">
        <Skeleton className="h-48 w-full" />
      </Card>
      <Card className="space-y-3 p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </Card>
    </div>
  );
}
