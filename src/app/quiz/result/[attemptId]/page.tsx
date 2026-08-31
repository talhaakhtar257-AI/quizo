import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, CheckCircle2, Trophy, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/get-current-user";

export const metadata: Metadata = { title: "Quiz Result" };
import { createServiceClient } from "@/lib/supabase/service";
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { Card, buttonVariants } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { OPTION_KEYS, type Difficulty, type OptionKey } from "@/lib/quiz-engine";
import { QuestionReviewList, type ReviewAnswer } from "@/components/QuestionReviewList";
import { ExitFullscreenOnMount } from "./ExitFullscreenOnMount";

export default async function QuizResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = createServiceClient();

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select(
      "id, quiz_id, student_id, status, score, total_correct, total_questions, started_at, submitted_at, quizzes(title, passing_score, courses(name))"
    )
    .eq("id", attemptId)
    .eq("student_id", currentUser.id)
    .maybeSingle();

  if (!attempt) {
    return <IneligibleNotice reason="This result could not be found." />;
  }

  if (attempt.status === "in_progress") {
    redirect(`/quiz/${attempt.quiz_id}/attempt/${attemptId}`);
  }

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select(
      "id, question_id, selected_option, is_correct, difficulty_at_time, display_order, pool_questions(question_text, explanation, option_a, option_b, option_c, option_d, correct_option)"
    )
    .eq("attempt_id", attemptId)
    .order("display_order");

  const { data: certificate } = await supabase
    .from("certificates")
    .select("certificate_number")
    .eq("attempt_id", attemptId)
    .maybeSingle();

  const hardCount = (answers ?? []).filter((answer) => answer.difficulty_at_time === "hard").length;
  const timeTakenSeconds =
    attempt.submitted_at && attempt.started_at
      ? Math.max(0, Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000))
      : null;

  const passingScore = attempt.quizzes?.passing_score ?? 70;
  const score = attempt.score ?? 0;
  const passed = score >= passingScore;

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
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 p-4 sm:p-6">
      <ExitFullscreenOnMount />

      <Card className="space-y-4 p-6 text-center">
        <div>
          <p className="text-sm text-fg-secondary">{attempt.quizzes?.title ?? "Quiz"}</p>
          <p className="text-5xl font-bold text-fg">{score}%</p>
        </div>

        <div
          className={
            "mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-semibold " +
            (passed ? "bg-success-bg text-success" : "bg-danger-bg text-danger")
          }
        >
          {passed ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
          {passed ? "PASS" : "FAIL"}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-fg-secondary">
          <span>
            {attempt.total_correct ?? 0} / {attempt.total_questions ?? 0} correct
          </span>
          {timeTakenSeconds !== null && <span>Time taken: {formatDuration(timeTakenSeconds)}</span>}
          {hardCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Trophy className="size-4" />
              Reached Hard difficulty {hardCount} time{hardCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {passed && certificate && (
            <Link href={`/certificates/${certificate.certificate_number}`} className={buttonVariants({})}>
              <Award className="size-4" />
              Download Certificate
            </Link>
          )}
          <Link href="/student" className={buttonVariants({ variant: "secondary" })}>
            Back to Dashboard
          </Link>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Question Review</h2>
        <QuestionReviewList answers={reviewAnswers} />
      </div>
    </div>
  );
}
