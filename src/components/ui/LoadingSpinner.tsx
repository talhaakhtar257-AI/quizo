import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  className,
  label = "Loading",
}: LoadingSpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-fg-secondary">
      <Loader2 className={cn("size-5 animate-spin", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
