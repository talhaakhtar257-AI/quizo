import type { Enums } from "@/types/database";

export type ResultKind = "pass" | "fail" | "in_progress" | "abandoned" | "expired";

// An in_progress attempt that nobody ever finalized (student closed the
// browser and never came back, so no heartbeat or submit ever ran) stays
// in_progress forever in the database — there is no background job. Flag
// anything running more than twice the quiz's time limit as "Abandoned" so
// admins can tell a stale row from a student who is still actively taking it.
export function resultKind(
  status: Enums<"attempt_status">,
  passed: boolean | null,
  startedAt: string,
  timerMinutes: number,
  now: Date
): ResultKind {
  if (status === "submitted") return passed ? "pass" : "fail";
  if (status === "expired") return "expired";
  const elapsedSeconds = (now.getTime() - new Date(startedAt).getTime()) / 1000;
  return elapsedSeconds > timerMinutes * 60 * 2 ? "abandoned" : "in_progress";
}
