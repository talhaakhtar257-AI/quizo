import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge, Card, buttonVariants } from "@/components/ui";
import { formatDate } from "@/lib/format";
import {
  MODE_LABELS,
  getAssignmentState,
  getDeadlineUrgency,
  type AssignmentQuiz,
  type AttemptSummary,
} from "@/lib/quiz-status";
import { cn } from "@/lib/utils";

export function AssignedQuizCard({
  quiz,
  deadline,
  attempts,
}: {
  quiz: AssignmentQuiz;
  deadline: string | null;
  attempts: AttemptSummary[];
}) {
  const state = getAssignmentState(quiz, attempts);
  const urgency = getDeadlineUrgency(deadline);
  const attemptsUsed = attempts.length;
  const maxAttemptsLabel = quiz.maxAttempts === 0 ? "unlimited" : quiz.maxAttempts;

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-fg">{quiz.title}</h3>
          <p className="text-sm text-fg-secondary">{quiz.courseTitle}</p>
        </div>
        {deadline && (
          <Badge variant={urgency === "overdue" ? "danger" : urgency === "soon" ? "warning" : "neutral"}>
            <Clock className="size-3" />
            {urgency === "overdue" ? "Overdue" : formatDate(deadline)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-secondary">
        <span>{quiz.questionsToShow} questions</span>
        <span>{quiz.timerMinutes} min</span>
        <span>Pass: {quiz.passingPercent}%</span>
        <span>{MODE_LABELS[quiz.difficultyMode]}</span>
        <span>
          Attempts: {attemptsUsed}/{maxAttemptsLabel}
        </span>
      </div>

      {state.kind === "exhausted" ? (
        <div className="flex items-center gap-3 pt-1">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-md text-fg-muted"
            )}
            aria-hidden="true"
          >
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
    </Card>
  );
}
