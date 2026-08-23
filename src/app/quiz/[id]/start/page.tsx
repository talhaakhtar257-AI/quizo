import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { checkEligibility } from "@/lib/quiz-engine";
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { StartQuizPanel } from "./StartQuizPanel";
import { ResumePanel } from "./ResumePanel";

export const metadata: Metadata = { title: "Start Quiz" };

export default async function QuizStartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: quizId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = createServiceClient();
  const eligibility = await checkEligibility(supabase, quizId, currentUser.id);

  if (!eligibility.ok) {
    return <IneligibleNotice reason={eligibility.reason} />;
  }

  if (eligibility.inProgressAttempt) {
    return <ResumePanel quiz={eligibility.quiz} attempt={eligibility.inProgressAttempt} />;
  }

  return <StartQuizPanel quiz={eligibility.quiz} attemptNumber={eligibility.attemptsUsed + 1} />;
}
