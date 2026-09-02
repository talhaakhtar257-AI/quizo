"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Badge, Button, DifficultyIndicator, LoadingSpinner, useToast } from "@/components/ui";
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { cn } from "@/lib/utils";
import type { Difficulty, OptionKey } from "@/lib/quiz-engine";
import type { CheatEventType } from "@/lib/anti-cheat";

interface QuestionOption {
  key: OptionKey;
  text: string;
}

interface QuestionState {
  questionId: string;
  questionText: string;
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
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false }> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status >= 500) throw new Error("Server error");
      const json = await res.json();
      return { ok: true, json };
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
        tone === "primary" && "text-sm font-semibold text-secondary",
        tone === "warning" && "text-base font-bold text-warning",
        tone === "danger" && "text-lg font-bold text-danger"
      )}
    >
      {formatClock(secondsRemaining)}
    </span>
  );
}

export function QuizAttemptScreen({
  quizId,
  attemptId,
  timeLimitMinutes,
  hasFullAntiCheat,
}: {
  quizId: string;
  attemptId: string;
  timeLimitMinutes: number | null;
  hasFullAntiCheat: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const hasTimer = timeLimitMinutes !== null;
  const totalSeconds = hasTimer ? timeLimitMinutes * 60 : Number.MAX_SAFE_INTEGER;

  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [connectionState, setConnectionState] = useState<ConnectionState>("ok");
  const [finishingMessage, setFinishingMessage] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [fullscreenLost, setFullscreenLost] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const autoSubmittedRef = useRef(false);
  const questionStartRef = useRef(Date.now());
  // Pro/Institution only (FEATURES.md §7) — Free students still see the
  // tab-switch toast + counter below, it just never reaches the server, so
  // there is nothing for the admin integrity report to read for a Free org.
  const eventBufferRef = useRef<{ type: CheatEventType; timestamp: string; metadata?: Record<string, unknown> }[]>(
    []
  );

  const apiUrl = useCallback((path: string) => `/api/student/quiz/${quizId}/${path}`, [quizId]);

  const pushEvent = useCallback(
    (type: CheatEventType, metadata?: Record<string, unknown>) => {
      if (!hasFullAntiCheat) return;
      eventBufferRef.current.push({ type, timestamp: new Date().toISOString(), metadata });
    },
    [hasFullAntiCheat]
  );

  const flushEvents = useCallback(() => {
    if (eventBufferRef.current.length === 0) return;
    const events = eventBufferRef.current;
    eventBufferRef.current = [];
    fetch("/api/student/quiz/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId, events }),
      keepalive: true,
    }).catch(() => {
      // Best-effort — a lost batch of anti-cheat events never blocks or
      // rolls back the quiz itself.
    });
  }, [attemptId]);

  useEffect(() => {
    const interval = setInterval(flushEvents, 30000);
    return () => {
      clearInterval(interval);
      flushEvents();
    };
  }, [flushEvents]);

  const goToResult = useCallback(() => {
    flushEvents();
    router.replace(`/quiz/result/${attemptId}`);
  }, [attemptId, router, flushEvents]);

  // Tab-switch detection is active for every plan — Free students see the
  // warning too, only the server-side log is gated.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((count) => count + 1);
        showToast("Tab switch detected. This is recorded.", "warning");
        pushEvent("tab_switch");
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [showToast, pushEvent]);

  // Copy/paste blocking is Pro/Institution only.
  useEffect(() => {
    if (!hasFullAntiCheat) return;
    function blockClipboard(event: ClipboardEvent) {
      event.preventDefault();
      showToast("Copying is disabled during this quiz.", "warning");
      pushEvent(event.type === "paste" ? "paste_attempt" : "copy_attempt");
    }
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    return () => {
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
    };
  }, [hasFullAntiCheat, showToast, pushEvent]);

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
      const lost = !document.fullscreenElement;
      setFullscreenLost(lost);
      if (lost) pushEvent("fullscreen_exit");
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [pushEvent]);

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
    const result = await postWithRetry(apiUrl("next-question"), { attempt_id: attemptId }, () =>
      setConnectionState("retrying")
    );
    if (!result.ok) {
      setConnectionState("failed");
      return;
    }
    setConnectionState("ok");
    const body = result.json;

    if (body.error) {
      setPhase("error");
      setFatalError(String(body.error));
      return;
    }

    const data = (body.data as Record<string, unknown>) ?? {};

    if (data.done) {
      setPhase("finishing");
      goToResult();
      return;
    }

    setSecondsRemaining(Number(data.time_remaining_seconds));
    questionStartRef.current = Date.now();
    setQuestion({
      questionId: String(data.question_id),
      questionText: String(data.question_text),
      difficulty: data.difficulty as Difficulty,
      options: data.options as QuestionOption[],
      questionNumber: Number(data.question_number),
      totalQuestions: Number(data.questions_to_show),
    });
    setSelectedKey(null);
    setPhase("question");
  }, [apiUrl, attemptId, goToResult]);

  useEffect(() => {
    loadNextQuestion();
    // Runs once on mount only — loadNextQuestion is stable across the
    // attempt's lifetime aside from the goToResult identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeUp = useCallback(async () => {
    setPhase("finishing");
    setFinishingMessage("Time is up. Your quiz has been submitted.");
    await fetch(apiUrl("submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt_id: attemptId }),
    }).catch(() => {});
    setTimeout(goToResult, 1500);
  }, [apiUrl, attemptId, goToResult]);

  // Local ticking clock for a smooth display; server responses (from
  // answering, the heartbeat, or hitting zero) always overwrite this.
  useEffect(() => {
    if (!hasTimer) return;
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
  }, [phase, handleTimeUp, hasTimer]);

  // Server heartbeat every 30s so a dead browser loses at most 30 seconds
  // and the stored time_remaining_seconds stays fresh.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (phaseRef.current === "finishing") return;
      const result = await postWithRetry(apiUrl("heartbeat"), { attempt_id: attemptId }, () =>
        setConnectionState("retrying")
      );
      if (!result.ok) {
        setConnectionState("failed");
        return;
      }
      setConnectionState("ok");
      const data = (result.json.data as Record<string, unknown>) ?? {};
      if (data.done) {
        setPhase("finishing");
        goToResult();
        return;
      }
      if (typeof data.time_remaining_seconds === "number") {
        setSecondsRemaining(data.time_remaining_seconds);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [apiUrl, attemptId, goToResult]);

  async function handleNext() {
    if (!question || !selectedKey || phase === "advancing") return;
    setPhase("advancing");
    const timeSpentSeconds = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000));
    const result = await postWithRetry(
      apiUrl("submit-answer"),
      {
        attempt_id: attemptId,
        question_id: question.questionId,
        selected_option: selectedKey,
        time_spent_seconds: timeSpentSeconds,
      },
      () => setConnectionState("retrying")
    );
    if (!result.ok) {
      setConnectionState("failed");
      setPhase("question");
      return;
    }
    if (result.json.error) {
      setConnectionState("ok");

      // The attempt is over — the timer ran out while they were reading, or
      // another tab already submitted it. The server will not accept this
      // answer and never will, so leaving the student on the question screen
      // with a red toast stranded them there for good. Ask for the next
      // question instead: that call finalizes an expired attempt and returns
      // "done", which takes them to their result.
      const reason = result.json.reason;
      if (reason === "time_expired" || reason === "already_submitted") {
        showToast(
          reason === "time_expired"
            ? "Time is up. Submitting your quiz."
            : "This quiz was already submitted. Taking you to your result.",
          "warning"
        );
        setPhase("finishing");
        await loadNextQuestion();
        return;
      }

      // Previously swallowed in silence: the student tapped Next, the spinner
      // blipped, and nothing happened with no explanation anywhere.
      setPhase("question");
      showToast(
        typeof result.json.error === "string"
          ? result.json.error
          : "That answer could not be saved. Please try again.",
        "danger"
      );
      return;
    }
    setConnectionState("ok");
    await loadNextQuestion();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (phaseRef.current !== "question" || !question) return;
    if (event.key >= "1" && event.key <= "4") {
      const index = Number(event.key) - 1;
      if (question.options[index]) setSelectedKey(question.options[index].key);
    } else if (event.key === "Enter") {
      handleNext();
    }
  }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, selectedKey]);

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
            <div className="flex items-center gap-3">
              {tabSwitchCount > 0 && (
                <Badge variant="warning" className="gap-1">
                  <Eye className="size-3" /> {tabSwitchCount} tab switch{tabSwitchCount === 1 ? "" : "es"}
                </Badge>
              )}
              {hasTimer && <TimerBadge secondsRemaining={secondsRemaining} totalSeconds={totalSeconds} />}
            </div>
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

        {phase === "loading" && connectionState === "failed" && !question && (
          <div className="max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
            <p className="mb-4 text-sm font-medium text-fg">
              We could not reach the server. Check your internet connection and try again — your
              attempt is safe.
            </p>
            <Button
              onClick={() => {
                setConnectionState("ok");
                loadNextQuestion();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {question && (phase === "question" || phase === "advancing") && (
          <div className="w-full max-w-2xl space-y-6">
            {/* Without this, a single failed request disabled every option AND
                the Next button while the only retry UI stayed hidden (it was
                gated on there being no question at all) — the whole screen
                went dead with nothing on it explaining why. */}
            {connectionState === "failed" && (
              <div className="rounded-lg border border-warning/40 bg-warning-bg p-4">
                <p className="text-sm font-medium text-fg">
                  Connection lost. Your attempt is safe — reconnect and continue.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setConnectionState("ok");
                    setPhase("question");
                  }}
                >
                  Try again
                </Button>
              </div>
            )}

            <DifficultyIndicator difficulty={question.difficulty} />

            <p className="text-xl font-semibold text-fg">{question.questionText}</p>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={option.key}
                  type="button"
                  disabled={phase === "advancing"}
                  onClick={() => setSelectedKey(option.key)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-base transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selectedKey === option.key
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
              disabled={!selectedKey || phase === "advancing" || connectionState === "failed"}
              loading={phase === "advancing"}
              onClick={handleNext}
            >
              {question.questionNumber === question.totalQuestions ? "Submit Quiz" : "Next Question"}
            </Button>
          </div>
        </div>
      )}

      {hasFullAntiCheat && fullscreenLost && phase !== "finishing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
            <p className="mb-4 text-sm font-medium text-fg">
              Please return to fullscreen to continue your quiz.
            </p>
            <Button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen?.();
                } catch {
                  // Browser refused (common on iOS and in some Android modes).
                  // Never leave the student trapped behind this overlay — the
                  // exit below is always available and the switch is logged
                  // either way, so the admin still sees it in the report.
                  showToast(
                    "Your browser would not allow fullscreen. You can continue without it.",
                    "warning"
                  );
                }
              }}
            >
              Return to Fullscreen
            </Button>
            <button
              type="button"
              onClick={() => setFullscreenLost(false)}
              className="mt-3 block w-full text-xs font-medium text-fg-secondary underline hover:text-fg"
            >
              Continue without fullscreen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
