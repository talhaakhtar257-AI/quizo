import type { DifficultyMode, AttemptStatus } from "@/lib/quiz-engine";

export interface StudentQuiz {
  id: string;
  title: string;
  courseName: string;
  timeLimitMinutes: number | null;
  passingScore: number;
  questionsToShow: number;
  difficultyMode: DifficultyMode;
  maxAttempts: number;
}

export interface AttemptSummary {
  id: string;
  status: AttemptStatus;
  score: number | null;
  submittedAt: string | null;
}

// There is no separate "assignment" step in this schema — a published quiz
// is automatically visible to every approved student in its course, so a
// quiz is either not started, in progress, retakeable, or out of attempts.
export type QuizState =
  | { kind: "not_started" }
  | { kind: "in_progress"; attemptId: string }
  | { kind: "can_retry"; attemptsUsed: number }
  | { kind: "exhausted"; bestScore: number | null };

export function getQuizState(
  quiz: Pick<StudentQuiz, "maxAttempts">,
  attempts: AttemptSummary[]
): QuizState {
  const inProgress = attempts.find((attempt) => attempt.status === "in_progress");
  if (inProgress) return { kind: "in_progress", attemptId: inProgress.id };

  const attemptsUsed = attempts.filter((attempt) => attempt.status !== "in_progress").length;
  const finishedScores = attempts
    .filter((attempt) => attempt.status === "submitted" && attempt.score !== null)
    .map((attempt) => attempt.score as number);
  const bestScore = finishedScores.length > 0 ? Math.max(...finishedScores) : null;

  if (quiz.maxAttempts !== 0 && attemptsUsed >= quiz.maxAttempts) {
    return { kind: "exhausted", bestScore };
  }
  if (attemptsUsed === 0) return { kind: "not_started" };
  return { kind: "can_retry", attemptsUsed };
}

export const MODE_LABELS: Record<DifficultyMode, string> = {
  adaptive: "Adaptive",
  easy_only: "Easy only",
  medium_only: "Medium only",
  hard_only: "Hard only",
};
