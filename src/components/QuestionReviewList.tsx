import { CheckCircle2, XCircle } from "lucide-react";
import { Card, DifficultyIndicator } from "@/components/ui";
import type { Difficulty } from "@/lib/quiz-engine";

export interface ReviewOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

export interface ReviewAnswer {
  id: string;
  questionOrder: number;
  isCorrect: boolean;
  difficultyAtTime: Difficulty;
  selectedOptionId: string | null;
  scenarioText: string | null;
  questionText: string;
  explanation: string | null;
  options: ReviewOption[];
}

// Shared between the student's own result page and the admin attempt-detail
// page — same per-question review card, same correct/selected highlighting.
export function QuestionReviewList({ answers }: { answers: ReviewAnswer[] }) {
  if (answers.length === 0) {
    return (
      <Card className="p-5 text-center text-sm text-fg-secondary">
        No questions were answered in this attempt.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {answers.map((answer) => {
        const selectedOption = answer.options.find((option) => option.id === answer.selectedOptionId);

        return (
          <Card key={answer.id} className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "flex size-6 shrink-0 items-center justify-center rounded-full " +
                    (answer.isCorrect ? "bg-success-bg text-success" : "bg-danger-bg text-danger")
                  }
                >
                  {answer.isCorrect ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                </span>
                <span className="text-sm font-medium text-fg-muted">Q{answer.questionOrder}</span>
              </div>
              <DifficultyIndicator difficulty={answer.difficultyAtTime} />
            </div>

            {answer.scenarioText && (
              <p className="rounded-md bg-info-bg p-3 text-sm leading-relaxed text-fg">
                {answer.scenarioText}
              </p>
            )}

            <p className="font-medium text-fg">{answer.questionText}</p>

            <div className="space-y-1.5 text-sm">
              {answer.options.map((option) => {
                const isSelected = option.id === answer.selectedOptionId;
                const isCorrect = option.isCorrect;
                return (
                  <div
                    key={option.id}
                    className={
                      "rounded-md border px-3 py-2 " +
                      (isCorrect
                        ? "border-success bg-success-bg text-success"
                        : isSelected
                          ? "border-danger bg-danger-bg text-danger"
                          : "border-border text-fg-secondary")
                    }
                  >
                    {option.optionText}
                    {isSelected && !isCorrect && " (your answer)"}
                    {isCorrect && " (correct answer)"}
                  </div>
                );
              })}
              {!selectedOption && (
                <p className="text-xs text-fg-muted">No answer was selected for this question.</p>
              )}
            </div>

            {answer.explanation && (
              <p className="text-sm text-fg-secondary">
                <span className="font-medium text-fg">Why: </span>
                {answer.explanation}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
