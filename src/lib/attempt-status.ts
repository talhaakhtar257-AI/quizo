import type { AttemptStatus } from "@/lib/quiz-engine";

export type ResultKind = "pass" | "fail" | "in_progress" | "abandoned" | "timed_out";

// An in_progress attempt that nobody ever finalized (student closed the
// browser and never came back, so no heartbeat or submit ever ran) stays
// in_progress forever in the database — there is no background job. Flag
// anything running more than twice the quiz's time limit as "Abandoned" so
// admins can tell a stale row from a student who is still actively taking
// it. A quiz with no time limit at all never gets flagged this way.
export function resultKind(
  status: AttemptStatus,
  score: number | null,
  passingScore: number,
  startedAt: string,
  timeLimitMinutes: number | null,
  now: Date
): ResultKind {
  if (status === "submitted") return score !== null && score >= passingScore ? "pass" : "fail";
  if (status === "timed_out") return "timed_out";
  if (timeLimitMinutes === null) return "in_progress";
  const elapsedSeconds = (now.getTime() - new Date(startedAt).getTime()) / 1000;
  return elapsedSeconds > timeLimitMinutes * 60 * 2 ? "abandoned" : "in_progress";
}
