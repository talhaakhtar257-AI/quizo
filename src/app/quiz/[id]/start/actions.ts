"use server";

import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { checkEligibility, initialDifficulty } from "@/lib/quiz-engine";

export async function startAttempt(
  quizId: string
): Promise<{ attemptId: string } | { error: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You must be logged in." };

  const supabase = createServiceClient();
  const eligibility = await checkEligibility(supabase, quizId, currentUser.id);

  if (!eligibility.ok) return { error: eligibility.reason };
  if (eligibility.inProgressAttempt) return { attemptId: eligibility.inProgressAttempt.id };

  const { data: quiz } = await supabase.from("quizzes").select("organization_id").eq("id", quizId).single();
  if (!quiz) return { error: "This quiz does not exist." };

  const timeLimitSeconds =
    eligibility.quiz.timeLimitMinutes !== null ? eligibility.quiz.timeLimitMinutes * 60 : null;

  const { data: inserted, error } = await supabase
    .from("quiz_attempts")
    .insert({
      organization_id: quiz.organization_id,
      quiz_id: quizId,
      student_id: currentUser.id,
      attempt_number: eligibility.attemptsUsed + 1,
      current_difficulty: initialDifficulty(eligibility.quiz.difficultyMode),
      questions_answered: 0,
      total_questions: eligibility.quiz.questionsToShow,
      time_remaining_seconds: timeLimitSeconds,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: "Could not start the quiz. Please try again." };
  return { attemptId: inserted.id };
}
