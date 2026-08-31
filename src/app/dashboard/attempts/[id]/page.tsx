import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clipboard, Eye, Gauge, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Attempt Detail" };
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { Badge, Card } from "@/components/ui";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/format";
import { resultKind } from "@/lib/attempt-status";
import type { AttemptStatus } from "@/lib/quiz-engine";
import { countViolations, computeIntegrityScore, isFlagged, INTEGRITY_FLAG_THRESHOLD } from "@/lib/anti-cheat";
import { levelLabel, OPTION_KEYS, type Difficulty, type OptionKey } from "@/lib/quiz-engine";
import { QuestionReviewList, type ReviewAnswer } from "@/components/QuestionReviewList";
import { cn } from "@/lib/utils";

export default async function AdminAttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select(
      "id, quiz_id, student_id, attempt_number, started_at, submitted_at, status, score, total_correct, total_questions, profiles(full_name, email), quizzes(title, passing_score, time_limit_minutes, courses(name))"
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) {
    return <IneligibleNotice reason="This attempt could not be found." />;
  }

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select(
      "id, question_id, selected_option, is_correct, difficulty_at_time, display_order, pool_questions(question_text, explanation, option_a, option_b, option_c, option_d, correct_option)"
    )
    .eq("attempt_id", attemptId)
    .order("display_order");

  const { data: events } = await supabase
    .from("quiz_event_stream")
    .select("event_type, created_at, metadata")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });

  const studentName = attempt.profiles?.full_name ?? attempt.profiles?.email ?? "Unknown student";
  const passingScore = attempt.quizzes?.passing_score ?? 70;
  const timeLimitMinutes = attempt.quizzes?.time_limit_minutes ?? null;
  const kind = resultKind(
    attempt.status as AttemptStatus,
    attempt.score,
    passingScore,
    attempt.started_at,
    timeLimitMinutes,
    new Date()
  );
  const timeTakenSeconds =
    attempt.submitted_at && attempt.started_at
      ? Math.max(
          0,
          Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)
        )
      : null;

  const violations = countViolations(events ?? []);
  const integrityScore = computeIntegrityScore(violations);
  const flagged = isFlagged(integrityScore);
  const hasAnyEvents = (events ?? []).length > 0;

  const reviewAnswers: ReviewAnswer[] = (answers ?? []).map((answer, index) => {
    const question = answer.pool_questions;
    const optionText: Record<OptionKey, string> = {
      a: question?.option_a ?? "",
      b: question?.option_b ?? "",
      c: question?.option_c ?? "",
      d: question?.option_d ?? "",
    };
    return {
      id: answer.id,
      questionOrder: answer.display_order ?? index + 1,
      isCorrect: answer.is_correct ?? false,
      difficultyAtTime: answer.difficulty_at_time as Difficulty,
      selectedOptionId: answer.selected_option,
      questionText: question?.question_text ?? "",
      explanation: question?.explanation ?? null,
      options: OPTION_KEYS.map((key) => ({
        id: key,
        optionText: optionText[key],
        isCorrect: question?.correct_option === key,
      })),
    };
  });

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/dashboard/attempts"
        className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back to attempts
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          {attempt.quizzes?.title ?? "Deleted quiz"}
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          <Link href={`/dashboard/users/${attempt.student_id}/attempts`} className="text-primary hover:underline">
            {studentName}
          </Link>{" "}
          · {attempt.quizzes?.courses?.name ?? "—"} · Attempt #{attempt.attempt_number}
        </p>
      </div>

      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <p className="text-xs font-medium text-fg-secondary">Started</p>
          <p className="text-sm text-fg">{formatDateTime(attempt.started_at)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary">Submitted</p>
          <p className="text-sm text-fg">
            {attempt.submitted_at ? formatDateTime(attempt.submitted_at) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary">Time taken</p>
          <p className="text-sm text-fg">
            {timeTakenSeconds !== null ? formatDuration(timeTakenSeconds) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary">Score</p>
          <p className="text-sm text-fg">
            {attempt.score !== null && attempt.total_correct !== null && attempt.total_questions !== null
              ? `${attempt.total_correct}/${attempt.total_questions}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary">Percentage</p>
          <p className="text-sm text-fg">{attempt.score !== null ? `${attempt.score}%` : "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary">Result</p>
          <div className="mt-0.5">
            {kind === "pass" && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> Pass
              </Badge>
            )}
            {kind === "fail" && (
              <Badge variant="danger" className="gap-1">
                <XCircle className="size-3" /> Fail
              </Badge>
            )}
            {kind === "timed_out" && <Badge variant="neutral">Timed out</Badge>}
            {kind === "in_progress" && (
              <Badge variant="warning">
                In Progress · started {formatRelativeTime(attempt.started_at)}
              </Badge>
            )}
            {kind === "abandoned" && (
              <Badge variant="neutral">Abandoned · started {formatRelativeTime(attempt.started_at)}</Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
          <Gauge className="size-5" /> Integrity Report
        </h2>
        {!hasAnyEvents ? (
          <Card className="p-5 text-sm text-fg-secondary">
            No anti-cheat events were logged for this attempt. Either nothing suspicious happened, or
            this academy&apos;s plan doesn&apos;t include full anti-cheat monitoring (Pro and
            Institution only — Free shows students a tab-switch warning but doesn&apos;t log it).
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-3xl font-bold text-fg">{integrityScore}</span>
              <span className="text-sm text-fg-secondary">/ 100 integrity score</span>
              {flagged && (
                <Badge variant="danger" className="gap-1">
                  <AlertTriangle className="size-3" /> Flagged — below {INTEGRITY_FLAG_THRESHOLD}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <ViolationStat icon={Eye} label="Tab switches" value={violations.tabSwitch} />
              <ViolationStat icon={AlertTriangle} label="Fullscreen exits" value={violations.fullscreenExit} />
              <ViolationStat icon={Gauge} label="Fast answers (<2s)" value={violations.fastAnswer} />
              <ViolationStat icon={Clipboard} label="Copy attempts" value={violations.copyAttempt} />
              <ViolationStat icon={Clipboard} label="Paste attempts" value={violations.pasteAttempt} />
            </div>
          </Card>
        )}
      </div>

      {reviewAnswers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-fg">Difficulty Journey</h2>
          <Card className="overflow-x-auto p-4">
            <div className="flex w-max gap-2">
              {reviewAnswers.map((answer) => (
                <JourneyChip
                  key={answer.id}
                  order={answer.questionOrder}
                  difficulty={answer.difficultyAtTime}
                  isCorrect={answer.isCorrect}
                />
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Questions</h2>
        <QuestionReviewList answers={reviewAnswers} />
      </div>
    </div>
  );
}

function ViolationStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-fg-secondary">
        <Icon className="size-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn("text-xl font-semibold", value > 0 ? "text-warning" : "text-fg")}>{value}</p>
    </div>
  );
}

const filledBars: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

function JourneyChip({
  order,
  difficulty,
  isCorrect,
}: {
  order: number;
  difficulty: Difficulty;
  isCorrect: boolean;
}) {
  const filled = filledBars[difficulty];
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-md border px-2.5 py-2",
        isCorrect ? "border-success/40 bg-success-bg" : "border-danger/40 bg-danger-bg"
      )}
      title={`Question ${order}: ${levelLabel(difficulty)}, ${isCorrect ? "correct" : "incorrect"}`}
    >
      <span className="text-[10px] font-medium text-fg-muted">Q{order}</span>
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-1 rounded-full bg-[#64748B]",
              bar === 1 && "h-1.5",
              bar === 2 && "h-2.5",
              bar === 3 && "h-3.5",
              bar > filled && "opacity-25"
            )}
          />
        ))}
      </span>
      <span className="sr-only">
        Question {order}: {levelLabel(difficulty)}, {isCorrect ? "correct" : "incorrect"}
      </span>
    </div>
  );
}
