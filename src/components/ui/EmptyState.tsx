import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-12 text-center",
        className
      )}
    >
      <div className="text-fg-muted">{icon}</div>
      <h3 className="text-lg font-semibold text-fg">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-fg-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
