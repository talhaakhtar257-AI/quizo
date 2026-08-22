"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DifficultyIndicator, LoadingSpinner } from "@/components/ui";
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/quiz-engine";

interface QuestionOption {
  id: string;
  text: string;
}

interface QuestionState {
  questionId: string;
  questionText: string;
  scenarioText: string | null;
  difficulty: Difficulty;
  options: QuestionOption[];
  questionNumber: number;
  totalQuestions: number;
}

type Phase = "loading" | "question" | "advancing" | "finishing" | "error";
type ConnectionState = "ok" | "retrying" | "failed";

const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function postWithRetry(
  url: string,
  body: unknown,
  onRetry: (attempt: number) => void
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false }> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status >= 500) throw new Error("Server error");
      const data = await res.json();
      return { ok: true, data };
    } catch {
      if (attempt < RETRY_DELAYS_MS.length) {
        onRetry(attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }
  }
  return { ok: false };
}

function getTimerTone(secondsRemaining: number, totalSeconds: number): "quiet" | "primary" | "warning" | "danger" {
  if (secondsRemaining < 60) return "danger";
  if (secondsRemaining < 300) return "warning";
  if (totalSeconds > 0 && secondsRemaining / totalSeconds > 0.5) return "quiet";
  return "primary";
}

function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

// Static colour + weight changes only — the spec is explicit that the timer
// must never flash or blink, even in the danger state.
function TimerBadge({ secondsRemaining, totalSeconds }: { secondsRemaining: number; totalSeconds: number }) {
  const tone = getTimerTone(secondsRemaining, totalSeconds);
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        tone === "quiet" && "text-sm font-medium text-fg-secondary",
        tone === "primary" && "text-sm font-semibold text-primary",
        tone === "warning" && "text-base font-bold text-warning",
        tone === "danger" && "text-lg font-bold text-danger"
      )}
    >
      {formatClock(secondsRemaining)}
    </span>
  );
}

export function QuizAttemptScreen({
  attemptId,
  timerMinutes,
}: {
  attemptId: string;
  timerMinutes: number;
}) {
  const router = useRouter();
  const totalSeconds = timerMinutes * 60;

  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [connectionState, setConnectionState] = useState<ConnectionState>("ok");
  const [finishingMessage, setFinishingMessage] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [fullscreenLost, setFullscreenLost] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoSubmittedRef = useRef(false);

  const goToResult = useCallback(() => {
    router.replace(`/quiz/result/${attemptId}`);
  }, [attemptId, router]);

  // Enter fullscreen defensively — covers a direct URL visit or a page
  // refresh, in addition to the request already made from the start screen.
  // iPhone Safari doesn't support the Fullscreen API on regular elements at
  // all (requestFullscreen is undefined there), so this silently no-ops on
  // iOS rather than breaking the quiz — the student just takes it windowed.
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    function handleChange() {
      setFullscreenLost(!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (phaseRef.current === "finishing") return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const loadNextQuestion = useCallback(async () => {
    const result = await postWithRetry("/api/quiz/next-question", { attemptId }, () =>
      setConnectionState("retrying")
    );
    if (!result.ok) {
      setConnectionState("failed");
      return;
    }
    setConnectionState("ok");
    const data = result.data;

    if (data.error) {
      setPhase("error");
      setFatalError(String(data.error));
      return;
    }

    if (data.done) {
      setPhase("finishing");
      goToResult();
      return;
    }

    setSecondsRemaining(Number(data.secondsRemaining));
    setQuestion({
      questionId: String(data.questionId),
      questionText: String(data.questionText),
      scenarioText: (data.scenarioText as string | null) ?? null,
      difficulty: data.difficulty as Difficulty,
      options: data.options as QuestionOption[],
      questionNumber: Number(data.questionNumber),
      totalQuestions: Number(data.totalQuestions),
    });
    setSelectedOptionId(null);
    setPhase("question");
  }, [attemptId, goToResult]);

  useEffect(() => {
    loadNextQuestion();
    // Runs once on mount only — loadNextQuestion is stable across the
    // attempt's lifetime aside from the goToResult identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeUp = useCallback(async () => {
    setPhase("finishing");
    setFinishingMessage("Time is up. Your quiz has been submitted.");
    await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    }).catch(() => {});
    setTimeout(goToResult, 1500);
  }, [attemptId, goToResult]);

  // Local ticking clock for a smooth display; server responses (from
  // answering, the heartbeat, or hitting zero) always overwrite this.
  useEffect(() => {
    if (phase !== "question" && phase !== "advancing") return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            handleTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, handleTimeUp]);

  // Server heartbeat every 30s so a dead browser loses at most 30 seconds
  // and the stored time_remaining_seconds stays fresh.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (phaseRef.current === "finishing") return;
      const result = await postWithRetry("/api/quiz/heartbeat", { attemptId }, () =>
        setConnectionState("retrying")
      );
      if (!result.ok) {
        setConnectionState("failed");
        return;
      }
      setConnectionState("ok");
      if (result.data.done) {
        setPhase("finishing");
        goToResult();
        return;
      }
      if (typeof result.data.secondsRemaining === "number") {
        setSecondsRemaining(result.data.secondsRemaining);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [attemptId, goToResult]);

  async function handleNext() {
    if (!question || !selectedOptionId || phase === "advancing") return;
    setPhase("advancing");
    const result = await postWithRetry(
      "/api/quiz/submit-answer",
      { attemptId, questionId: question.questionId, selectedOptionId },
      () => setConnectionState("retrying")
    );
    if (!result.ok) {
      setConnectionState("failed");
      setPhase("question");
      return;
    }
    setConnectionState("ok");
    await loadNextQuestion();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (phaseRef.current !== "question" || !question) return;
    if (event.key >= "1" && event.key <= "4") {
      const index = Number(event.key) - 1;
      if (question.options[index]) setSelectedOptionId(question.options[index].id);
    } else if (event.key === "Enter") {
      handleNext();
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, selectedOptionId]);

  if (phase === "error" && fatalError) {
    return <IneligibleNotice reason={fatalError} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {connectionState !== "ok" && (
        <div
          role="status"
          className={cn(
            "px-4 py-2 text-center text-sm font-medium",
            connectionState === "retrying" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
          )}
        >
          {connectionState === "retrying"
            ? "Connection lost. Retrying..."
            : "We could not reach the server. Your progress up to the last answered question is saved. Please check your internet and reload."}
        </div>
      )}

      {finishingMessage && (
        <div role="status" className="bg-info-bg px-4 py-2 text-center text-sm font-medium text-info">
          {finishingMessage}
        </div>
      )}

      {question && (
        <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <p className="text-sm font-medium text-fg-secondary">
              Question {question.questionNumber} of {question.totalQuestions}
            </p>
            <TimerBadge secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} />
          </div>
          <div className="mx-auto mt-2 max-w-3xl">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${((question.questionNumber - 1) / question.totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        {phase === "loading" && connectionState !== "failed" && <LoadingSpinner label="Loading question" />}

        {question && (phase === "question" || phase === "advancing") && (
          <div className="w-full max-w-2xl space-y-6">
            <DifficultyIndicator difficulty={question.difficulty} />

            {question.scenarioText && (
              <div className="rounded-lg bg-info-bg p-5 leading-relaxed text-fg">{question.scenarioText}</div>
            )}

            <p className="text-xl font-semibold text-fg">{question.questionText}</p>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={phase === "advancing" || connectionState === "failed"}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-base transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selectedOptionId === option.id
                      ? "border-primary bg-primary/10 text-fg"
                      : "border-border bg-surface text-fg hover:bg-surface-raised"
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-fg-muted">
                    {index + 1}
                  </span>
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {question && (
        <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-2xl justify-end">
            <Button
              size="lg"
              disabled={!selectedOptionId || phase === "advancing" || connectionState === "failed"}
              loading={phase === "advancing"}
              onClick={handleNext}
            >
              {question.questionNumber === question.totalQuestions ? "Submit Quiz" : "Next Question"}
            </Button>
          </div>
        </div>
      )}

      {fullscreenLost && phase !== "finishing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
            <p className="mb-4 text-sm font-medium text-fg">
              Please return to fullscreen to continue your quiz.
            </p>
            <Button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
