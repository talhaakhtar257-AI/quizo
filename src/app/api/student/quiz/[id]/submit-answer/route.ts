import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext, computeSecondsRemaining, nextDifficulty, OPTION_KEYS } from "@/lib/quiz-engine";
import { logServerError } from "@/lib/log";

interface RequestBody {
  attempt_id?: string;
  question_id?: string;
  selected_option?: string;
  time_spent_seconds?: number;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = await params;
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
  const { attempt_id: attemptId, question_id: questionId, selected_option: selectedOption } = body;
  if (!attemptId || !questionId || !selectedOption) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!OPTION_KEYS.includes(selectedOption as (typeof OPTION_KEYS)[number])) {
    return NextResponse.json({ error: "Invalid option selected." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await loadAttemptContext(supabase, attemptId, currentUser.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { attempt, quiz } = result.context;
  if (quiz.id !== quizId) {
    return NextResponse.json({ error: "This attempt does not belong to this quiz." }, { status: 400 });
  }

  if (attempt.status !== "in_progress") {
    // `reason` is what the quiz screen keys off. Without it the browser could
    // only show the message and leave the student stranded on a question it
    // will never be allowed to answer.
    return NextResponse.json(
      { error: "This attempt has already been submitted.", reason: "already_submitted" },
      { status: 409 }
    );
  }

  const secondsRemaining = computeSecondsRemaining(quiz.timeLimitMinutes, attempt.startedAt);
  if (secondsRemaining <= 0) {
    return NextResponse.json({ error: "Time is up.", reason: "time_expired" }, { status: 409 });
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
    .from("pool_questions")
    .select("id, difficulty, correct_option, pool_id, quiz_pools!inner(quiz_id)")
    .eq("id", questionId)
    .maybeSingle();
  if (!question || question.quiz_pools?.quiz_id !== quiz.id) {
    return NextResponse.json({ error: "This question does not belong to this quiz." }, { status: 400 });
  }

  const isCorrect = question.correct_option === selectedOption;
  const newQuestionsAnswered = attempt.questionsAnswered + 1;
  const newDifficulty = nextDifficulty(attempt.currentDifficulty, isCorrect, quiz.difficultyMode);

  const { error: insertError } = await supabase.from("attempt_answers").insert({
    organization_id: attempt.organizationId,
    attempt_id: attemptId,
    question_id: questionId,
    selected_option: selectedOption,
    is_correct: isCorrect,
    difficulty_at_time: question.difficulty,
    time_spent_seconds: body.time_spent_seconds ?? null,
    display_order: newQuestionsAnswered,
    options_order: OPTION_KEYS.join(","),
  });
  if (insertError) {
    // A unique-violation here means a concurrent request already answered
    // this exact question first (the check above raced it) — the answer is
    // safely saved, just not by this request.
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This question has already been answered." }, { status: 409 });
    }
    logServerError("submit-answer.insert", insertError, { attemptId, questionId });
    return NextResponse.json({ error: "Could not save your answer. Please try again." }, { status: 500 });
  }

  // Guarded on status so a concurrent finalize (heartbeat hitting
  // time-expiry, or another request completing the quiz) between our read
  // above and here can't un-freeze an already-submitted attempt's
  // difficulty/progress — a submitted attempt is immutable (rule 9).
  const { data: updatedRows } = await supabase
    .from("quiz_attempts")
    .update({
      current_difficulty: newDifficulty,
      questions_answered: newQuestionsAnswered,
      time_remaining_seconds: secondsRemaining,
    })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json(
      { error: "This attempt has already been submitted.", reason: "already_submitted" },
      { status: 409 }
    );
  }

  // Response-time flag is a Pro/Institution feature (FEATURES.md §7) —
  // logged server-side rather than trusted from the client, same as every
  // other timing value in this engine.
  const timeSpentSeconds = body.time_spent_seconds;
  if (result.context.hasFullAntiCheat && typeof timeSpentSeconds === "number" && timeSpentSeconds < 2) {
    await supabase.from("quiz_event_stream").insert({
      organization_id: attempt.organizationId,
      attempt_id: attemptId,
      student_id: currentUser.id,
      event_type: "fast_answer",
      metadata: { question_id: questionId, time_spent_seconds: timeSpentSeconds },
    });
  }

  const continueQuiz = newQuestionsAnswered < quiz.questionsToShow && secondsRemaining > 0;

  // Never reveals whether the answer was correct — is_correct is stripped
  // from every response before submission (rule 5).
  return NextResponse.json({
    data: { continue: continueQuiz, questions_answered: newQuestionsAnswered, time_remaining_seconds: secondsRemaining },
  });
}
