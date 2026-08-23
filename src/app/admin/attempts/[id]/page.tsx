import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Attempt Detail" };
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { Badge, Card } from "@/components/ui";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/format";
import { resultKind } from "@/lib/attempt-status";
import { levelLabel, type Difficulty } from "@/lib/quiz-engine";
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
    .from("attempts")
    .select(
      "id, quiz_id, user_id, attempt_number, started_at, submitted_at, status, score, total_questions, percentage, passed, profiles(full_name, email), quizzes(title, passing_percent, timer_minutes, courses(title))"
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) {
    return <IneligibleNotice reason="This attempt could not be found." />;
  }

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select(
      "id, question_id, selected_option_id, is_correct, difficulty_at_time, question_order, questions(question_text, scenario_text, explanation)"
    )
    .eq("attempt_id", attemptId)
    .order("question_order");

  const questionIds = (answers ?? []).map((answer) => answer.question_id);
  const { data: allOptions } =
    questionIds.length > 0
      ? await supabase
          .from("options")
          .select("id, question_id, option_text, is_correct, option_order")
          .in("question_id", questionIds)
          .order("option_order")
      : { data: [] };

  const optionsByQuestion = new Map<string, typeof allOptions>();
  for (const option of allOptions ?? []) {
    const list = optionsByQuestion.get(option.question_id) ?? [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  }

  const studentName = attempt.profiles?.full_name ?? attempt.profiles?.email ?? "Unknown student";
  const timerMinutes = attempt.quizzes?.timer_minutes ?? 30;
  const kind = resultKind(attempt.status, attempt.passed, attempt.started_at, timerMinutes, new Date());
  const timeTakenSeconds =
    attempt.submitted_at && attempt.started_at
      ? Math.max(
          0,
          Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000)
        )
      : null;

  const reviewAnswers: ReviewAnswer[] = (answers ?? []).map((answer) => ({
    id: answer.id,
    questionOrder: answer.question_order,
    isCorrect: answer.is_correct,
    difficultyAtTime: answer.difficulty_at_time,
    selectedOptionId: answer.selected_option_id,
    scenarioText: answer.questions?.scenario_text ?? null,
    questionText: answer.questions?.question_text ?? "",
    explanation: answer.questions?.explanation ?? null,
    options: (optionsByQuestion.get(answer.question_id) ?? []).map((option) => ({
      id: option.id,
      optionText: option.option_text,
      isCorrect: option.is_correct,
    })),
  }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/admin/attempts"
        className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back to attempts
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          {attempt.quizzes?.title ?? "Deleted quiz"}
        </h1>
        <p className="mt-1 text-sm text-fg-secondary">
          <Link href={`/admin/users/${attempt.user_id}/attempts`} className="text-primary hover:underline">
            {studentName}
          </Link>{" "}
          · {attempt.quizzes?.courses?.title ?? "—"} · Attempt #{attempt.attempt_number}
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
            {attempt.score !== null && attempt.total_questions !== null
              ? `${attempt.score}/${attempt.total_questions}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-fg-secondary">Percentage</p>
          <p className="text-sm text-fg">{attempt.percentage !== null ? `${attempt.percentage}%` : "—"}</p>
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
            {kind === "expired" && <Badge variant="neutral">Expired</Badge>}
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
