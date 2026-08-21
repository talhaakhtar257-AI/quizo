import type { Enums } from "@/types/database";

export interface AssignmentQuiz {
  id: string;
  title: string;
  courseTitle: string;
  timerMinutes: number;
  passingPercent: number;
  questionsToShow: number;
  difficultyMode: Enums<"quiz_difficulty_mode">;
  maxAttempts: number;
}

export interface AttemptSummary {
  id: string;
  status: Enums<"attempt_status">;
  percentage: number | null;
  submittedAt: string | null;
}

export type AssignmentState =
  | { kind: "not_started" }
  | { kind: "in_progress"; attemptId: string }
  | { kind: "can_retry"; attemptsUsed: number }
  | { kind: "exhausted"; bestScore: number | null };

export function getAssignmentState(
  quiz: Pick<AssignmentQuiz, "maxAttempts">,
  attempts: AttemptSummary[]
): AssignmentState {
  const inProgress = attempts.find((attempt) => attempt.status === "in_progress");
  if (inProgress) return { kind: "in_progress", attemptId: inProgress.id };

  const attemptsUsed = attempts.length;
  const submittedScores = attempts
    .filter((attempt) => attempt.status === "submitted" && attempt.percentage !== null)
    .map((attempt) => attempt.percentage as number);
  const bestScore = submittedScores.length > 0 ? Math.max(...submittedScores) : null;

  if (quiz.maxAttempts !== 0 && attemptsUsed >= quiz.maxAttempts) {
    return { kind: "exhausted", bestScore };
  }
  if (attemptsUsed === 0) return { kind: "not_started" };
  return { kind: "can_retry", attemptsUsed };
}

export type DeadlineUrgency = "none" | "normal" | "soon" | "overdue";

export function getDeadlineUrgency(deadline: string | null): DeadlineUrgency {
  if (!deadline) return "none";
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 3 ? "soon" : "normal";
}

export const MODE_LABELS: Record<Enums<"quiz_difficulty_mode">, string> = {
  adaptive: "Adaptive",
  easy_only: "Easy only",
  medium_only: "Medium only",
  hard_only: "Hard only",
};
