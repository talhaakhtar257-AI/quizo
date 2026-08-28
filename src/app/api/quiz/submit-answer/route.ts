import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext, computeSecondsRemaining, nextDifficulty } from "@/lib/quiz-engine";

interface RequestBody {
  attemptId?: string;
  questionId?: string;
  selectedOptionId?: string;
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { attemptId, questionId, selectedOptionId } = body;
  if (!attemptId || !questionId || !selectedOptionId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await loadAttemptContext(supabase, attemptId, currentUser.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { attempt, quiz } = result.context;

  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "This attempt has already been submitted." }, { status: 409 });
  }

  const secondsRemaining = computeSecondsRemaining(quiz.timerMinutes, attempt.startedAt);
  if (secondsRemaining <= 0) {
    return NextResponse.json({ error: "Time is up." }, { status: 409 });
  }

  const { data: existingAnswer } = await supabase
    .from("attempt_answers")
    .select("id")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (existingAnswer) {
    return NextResponse.json({ error: "This question has already been answered." }, { status: 409 });
  }

  const { data: question } = await supabase
    .from("questions")
    .select("id, difficulty, quiz_id")
    .eq("id", questionId)
    .maybeSingle();
  if (!question || question.quiz_id !== quiz.id) {
    return NextResponse.json({ error: "This question does not belong to this quiz." }, { status: 400 });
  }

  const { data: option } = await supabase
    .from("options")
    .select("id, is_correct")
    .eq("id", selectedOptionId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (!option) {
    return NextResponse.json({ error: "Invalid option selected." }, { status: 400 });
  }

  const newQuestionsAnswered = attempt.questionsAnswered + 1;
  const newDifficulty = nextDifficulty(attempt.currentDifficulty, option.is_correct, quiz.difficultyMode);

  const { error: insertError } = await supabase.from("attempt_answers").insert({
    attempt_id: attemptId,
    question_id: questionId,
    selected_option_id: selectedOptionId,
    is_correct: option.is_correct,
    difficulty_at_time: question.difficulty,
    question_order: newQuestionsAnswered,
  });
  if (insertError) {
    // A unique-violation here means a concurrent request already answered
    // this exact question first (the check above raced it) — the answer is
    // safely saved, just not by this request.
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This question has already been answered." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not save your answer. Please try again." }, { status: 500 });
  }

  // Guarded on status so a concurrent finalize (heartbeat hitting time-expiry,
  // or another request completing the quiz) between our read above and here
  // can't un-freeze an already-submitted attempt's difficulty/progress —
  // rule 6 says a submitted attempt is immutable.
  const { data: updatedRows } = await supabase
    .from("attempts")
    .update({
      current_difficulty: newDifficulty,
      questions_answered: newQuestionsAnswered,
      time_remaining_seconds: secondsRemaining,
    })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ error: "This attempt has already been submitted." }, { status: 409 });
  }

  const continueQuiz = newQuestionsAnswered < quiz.questionsToShow && secondsRemaining > 0;

  return NextResponse.json({ continue: continueQuiz, questionsAnswered: newQuestionsAnswered });
}
