import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge, Card, buttonVariants } from "@/components/ui";
import { MODE_LABELS, getQuizState, type StudentQuiz, type AttemptSummary } from "@/lib/quiz-status";
import { cn } from "@/lib/utils";

export function QuizCard({ quiz, attempts }: { quiz: StudentQuiz; attempts: AttemptSummary[] }) {
  const state = getQuizState(quiz, attempts);
  const attemptsUsed = attempts.filter((attempt) => attempt.status !== "in_progress").length;
  const maxAttemptsLabel = quiz.maxAttempts === 0 ? "unlimited" : quiz.maxAttempts;

  return (
    <Card className="space-y-3 p-5">
      <div>
        <h3 className="font-semibold text-fg">{quiz.title}</h3>
        <p className="text-sm text-fg-secondary">{quiz.courseName}</p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-secondary">
        <span>{quiz.questionsToShow} questions</span>
        <span>{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "No time limit"}</span>
        <span>Pass: {quiz.passingScore}%</span>
        <span>{MODE_LABELS[quiz.difficultyMode]}</span>
        <span>
          Attempts: {attemptsUsed}/{maxAttemptsLabel}
        </span>
      </div>

      {state.kind === "exhausted" ? (
        <div className="flex items-center gap-3 pt-1">
          <span className="flex size-9 items-center justify-center rounded-md text-fg-muted" aria-hidden="true">
            <AlertTriangle className="size-4" />
          </span>
          <p className="text-sm text-fg-secondary">
            No attempts left.
            {state.bestScore !== null ? ` Best score: ${state.bestScore}%.` : ""}
          </p>
        </div>
      ) : (
        <Link
          href={`/quiz/${quiz.id}/start`}
          className={cn(
            buttonVariants({ size: "sm" }),
            state.kind === "in_progress" && "ring-2 ring-primary ring-offset-2 ring-offset-surface"
          )}
        >
          {state.kind === "in_progress" ? "Resume Quiz" : "Start Quiz"}
        </Link>
      )}

      {state.kind === "can_retry" && <Badge variant="info">Retake available</Badge>}
    </Card>
  );
}
