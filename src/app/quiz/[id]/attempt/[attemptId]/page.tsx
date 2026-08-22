import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext } from "@/lib/quiz-engine";
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { QuizAttemptScreen } from "./QuizAttemptScreen";

export default async function QuizAttemptPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id: quizId, attemptId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = createServiceClient();
  const result = await loadAttemptContext(supabase, attemptId, currentUser.id);

  if (!result.ok) {
    return <IneligibleNotice reason={result.error} />;
  }
  if (result.context.attempt.quizId !== quizId) {
    return <IneligibleNotice reason="This attempt does not belong to this quiz." />;
  }
  if (result.context.attempt.status !== "in_progress") {
    redirect(`/quiz/result/${attemptId}`);
  }

  return (
    <QuizAttemptScreen
      attemptId={attemptId}
      timerMinutes={result.context.quiz.timerMinutes}
    />
  );
}
