import { Skeleton } from "@/components/ui";

// Very brief — this route only checks ownership/eligibility before handing off
// to the fullscreen quiz client shell, which has its own between-question
// loading state. Kept minimal and full-bleed to avoid a layout jump.
export default function QuizAttemptLoading() {
  return (
    <div className="flex min-h-full flex-col gap-6 p-4 sm:p-8">
      <Skeleton className="h-3 w-full" />
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-7 w-3/4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
