"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { MODE_LABELS } from "@/lib/quiz-status";
import type { EligibleQuiz } from "@/lib/quiz-engine";
import { startAttempt } from "./actions";

const BASE_RULES = [
  "Once you start, the quiz opens in fullscreen mode.",
  "You cannot go back to a previous question.",
  "Your progress is saved automatically. You can resume if you lose connection.",
  "The quiz submits automatically when time runs out.",
  "Do not refresh or close the browser unless necessary.",
];

const ADAPTIVE_RULE = "The difficulty adjusts to your answers.";

export function StartQuizPanel({
  quiz,
  attemptNumber,
}: {
  quiz: EligibleQuiz;
  attemptNumber: number;
}) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules =
    quiz.difficultyMode === "adaptive"
      ? [BASE_RULES[0], BASE_RULES[1], ADAPTIVE_RULE, ...BASE_RULES.slice(2)]
      : BASE_RULES;

  async function handleStart() {
    setLoading(true);
    setError(null);

    const result = await startAttempt(quiz.id);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // iOS Safari and some browsers don't support the Fullscreen API —
      // degrade gracefully rather than block the quiz.
    }

    router.push(`/quiz/${quiz.id}/attempt/${result.attemptId}`);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center gap-6 p-4">
      <Card className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-bg text-info">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-fg">{quiz.title}</h1>
            <p className="text-sm text-fg-secondary">{quiz.courseTitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Questions" value={String(quiz.questionsToShow)} />
          <Stat label="Time limit" value={`${quiz.timerMinutes} min`} />
          <Stat label="Passing" value={`${quiz.passingPercent}%`} />
          <Stat label="Mode" value={MODE_LABELS[quiz.difficultyMode]} />
        </div>

        <Badge variant="info">
          This is attempt {attemptNumber} of {quiz.maxAttempts === 0 ? "unlimited" : quiz.maxAttempts}
        </Badge>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-sm font-semibold text-fg">Before you start</h2>
        <ul className="space-y-2 text-sm text-fg-secondary">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </Card>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <label className="flex items-center gap-3 text-sm font-medium text-fg">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="size-5 shrink-0"
        />
        I have read and understood the instructions
      </label>

      <div className="flex items-center gap-3">
        <Button
          size="lg"
          disabled={!acknowledged}
          loading={loading}
          onClick={handleStart}
          className="flex-1"
        >
          Start Quiz
        </Button>
        <Link href="/dashboard" className="text-sm text-fg-secondary hover:text-fg">
          Cancel
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-raised p-3 text-center">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}
