import { Card, Skeleton } from "@/components/ui";

export default function VerifyLoading() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-4 pt-16">
      <Card className="flex flex-col items-center gap-3 p-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
      </Card>
    </div>
  );
}
