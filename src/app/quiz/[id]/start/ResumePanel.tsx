"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Badge, Button, Card, DifficultyIndicator } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import type { EligibleQuiz, InProgressAttempt } from "@/lib/quiz-engine";

export function ResumePanel({
  quiz,
  attempt,
}: {
  quiz: EligibleQuiz;
  attempt: InProgressAttempt;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResume() {
    setLoading(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Degrade gracefully on browsers without Fullscreen API support.
    }
    router.push(`/quiz/${quiz.id}/attempt/${attempt.id}`);
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-6 p-4">
      <Card className="space-y-4 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-info-bg text-info">
          <PlayCircle className="size-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-fg">{quiz.title}</h1>
          <p className="text-sm text-fg-secondary">
            You have a quiz already in progress.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Badge variant="info">Time left: {formatDuration(attempt.timeRemainingSeconds)}</Badge>
          <DifficultyIndicator difficulty={attempt.currentDifficulty} />
        </div>

        <p className="text-xs text-fg-muted">
          {attempt.questionsAnswered} of {quiz.questionsToShow} questions answered so far.
        </p>

        <Button size="lg" loading={loading} onClick={handleResume} className="w-full">
          Resume Quiz
        </Button>
        <Link href="/student" className="block text-sm text-fg-secondary hover:text-fg">
          Back to Dashboard
        </Link>
      </Card>
    </div>
  );
}
