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

  const { data: inserted, error } = await supabase
    .from("attempts")
    .insert({
      quiz_id: quizId,
      user_id: currentUser.id,
      attempt_number: eligibility.attemptsUsed + 1,
      status: "in_progress",
      current_difficulty: initialDifficulty(eligibility.quiz.difficultyMode),
      time_remaining_seconds: eligibility.quiz.timerMinutes * 60,
      total_questions: eligibility.quiz.questionsToShow,
      questions_answered: 0,
    })
    .select("id")
    .single();

  if (error || !inserted) return { error: "Could not start the quiz. Please try again." };
  return { attemptId: inserted.id };
}
