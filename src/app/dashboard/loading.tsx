import { Card, Skeleton } from "@/components/ui";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <Skeleton className="h-[74px] w-full max-w-3xl" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="space-y-2 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card className="p-5">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>

      <Card className="p-5">
        <Skeleton className="h-48 w-full" />
      </Card>

      <Card className="p-5">
        <Skeleton className="h-56 w-full" />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
        <Card className="space-y-2 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>

      <Card className="p-5">
        <Skeleton className="h-64 w-full" />
      </Card>
    </div>
  );
}
