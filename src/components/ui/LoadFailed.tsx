import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Every list page used to treat "the database said no" and "you have nothing
// yet" as the same thing, because a failed Supabase query returns null data
// and the code did `data ?? []`. An academy owner whose database was asleep
// — which the free tier does after seven idle days — was told "No courses
// yet. Create your first course." That is the app lying about their data,
// and it is the kind of message that makes someone rebuild what they already
// have.
//
// This is deliberately not an EmptyState: an empty list is a normal, calm
// state, and a failed load is not.
export function LoadFailed({
  what,
  className,
}: {
  /** Plain words for the thing that failed, e.g. "your courses". */
  what: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-danger/40 bg-danger-bg/40 p-12 text-center",
        className
      )}
    >
      <AlertTriangle className="size-10 text-danger" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-fg">Could not load {what}</h3>
      <p className="max-w-sm text-sm text-fg-secondary">
        Nothing has been lost — this page could not reach the database just now. Refresh the page in
        a moment. If it keeps happening, the database may be asleep and needs waking from the
        Supabase dashboard.
      </p>
    </div>
  );
}
