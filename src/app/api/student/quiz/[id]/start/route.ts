import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { checkEligibility, initialDifficulty, getHasFullAntiCheat } from "@/lib/quiz-engine";
import { logServerError } from "@/lib/log";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const eligibility = await checkEligibility(supabase, quizId, currentUser.id);
  if (!eligibility.ok) {
    return NextResponse.json({ error: eligibility.reason }, { status: 400 });
  }

  // Resume, not a new attempt, if one is already in progress.
  if (eligibility.inProgressAttempt) {
    return NextResponse.json({
      data: {
        attempt_id: eligibility.inProgressAttempt.id,
        attempt_number: eligibility.attemptsUsed,
        questions_to_show: eligibility.quiz.questionsToShow,
        time_remaining_seconds: eligibility.inProgressAttempt.timeRemainingSeconds,
      },
    });
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("organization_id")
    .eq("id", quizId)
    .single();

  const timeLimitSeconds =
    eligibility.quiz.timeLimitMinutes !== null ? eligibility.quiz.timeLimitMinutes * 60 : null;

  const { data: inserted, error } = await supabase
    .from("quiz_attempts")
    .insert({
      organization_id: quiz!.organization_id,
      quiz_id: quizId,
      student_id: currentUser.id,
      attempt_number: eligibility.attemptsUsed + 1,
      current_difficulty: initialDifficulty(eligibility.quiz.difficultyMode),
      questions_answered: 0,
      total_questions: eligibility.quiz.questionsToShow,
      time_remaining_seconds: timeLimitSeconds,
      status: "in_progress",
    })
    .select("id, attempt_number, started_at")
    .single();

  if (error || !inserted) {
    logServerError("quiz-start.insert", error, { studentId: currentUser.id });
    return NextResponse.json({ error: "Could not start the quiz. Please try again." }, { status: 500 });
  }

  const hasFullAntiCheat = await getHasFullAntiCheat(supabase, quiz!.organization_id);
  if (hasFullAntiCheat) {
    await supabase.from("quiz_event_stream").insert({
      organization_id: quiz!.organization_id,
      attempt_id: inserted.id,
      student_id: currentUser.id,
      event_type: "quiz_started",
      metadata: {},
    });
  }

  return NextResponse.json({
    data: {
      attempt_id: inserted.id,
      attempt_number: inserted.attempt_number,
      questions_to_show: eligibility.quiz.questionsToShow,
      started_at: inserted.started_at,
      time_remaining_seconds: timeLimitSeconds ?? Number.MAX_SAFE_INTEGER,
      has_full_anti_cheat: hasFullAntiCheat,
    },
  });
}
