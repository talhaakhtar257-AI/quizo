import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatRelativeTime } from "@/lib/format";
import type { ResultKind } from "@/lib/attempt-status";

export function ResultBadge({
  kind,
  startedAt,
  now,
}: {
  kind: ResultKind;
  startedAt: string;
  now: Date;
}) {
  if (kind === "pass") return <Badge variant="success">Pass</Badge>;
  if (kind === "fail") return <Badge variant="danger">Fail</Badge>;
  if (kind === "timed_out") return <Badge variant="neutral">Timed out</Badge>;
  if (kind === "in_progress") {
    return (
      <div className="space-y-0.5">
        <Badge variant="warning">In Progress</Badge>
        <div className="text-xs text-fg-muted">started {formatRelativeTime(startedAt, now)}</div>
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <Badge variant="neutral" className="gap-1">
        <AlertTriangle className="size-3" /> Abandoned
      </Badge>
      <div className="text-xs text-fg-muted">started {formatRelativeTime(startedAt, now)}</div>
    </div>
  );
}
