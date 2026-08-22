import { Skeleton } from "@/components/ui";

export default function AdminReportsLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <Skeleton className="h-[74px] w-full" />

      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-9 w-72" />
      </div>

      <Skeleton className="h-96 w-full" />
    </div>
  );
}
