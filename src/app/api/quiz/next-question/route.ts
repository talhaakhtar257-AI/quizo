import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext, computeSecondsRemaining, finalizeAttempt, fallbackOrder } from "@/lib/quiz-engine";

interface RequestBody {
  attemptId?: string;
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

  const { attemptId } = body;
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attemptId." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await loadAttemptContext(supabase, attemptId, currentUser.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { attempt, quiz } = result.context;

  if (attempt.status !== "in_progress") {
    const finalized = await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({ done: true, reason: "already_submitted", ...finalized });
  }

  const secondsRemaining = computeSecondsRemaining(quiz.timerMinutes, attempt.startedAt);
  if (secondsRemaining <= 0) {
    const finalized = await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({
      done: true,
      reason: "time_expired",
      message: "Time is up. Your quiz has been submitted.",
      ...finalized,
    });
  }

  if (attempt.questionsAnswered >= quiz.questionsToShow) {
    const finalized = await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({ done: true, reason: "complete", ...finalized });
  }

  const { data: usedRows } = await supabase
    .from("attempt_answers")
    .select("question_id")
    .eq("attempt_id", attemptId);
  const usedIds = (usedRows ?? []).map((row) => row.question_id);

  let chosenQuestion:
    | { id: string; difficulty: string; question_text: string; scenario_text: string | null }
    | null = null;

  for (const level of fallbackOrder(attempt.currentDifficulty)) {
    let query = supabase
      .from("questions")
      .select("id, difficulty, question_text, scenario_text")
      .eq("quiz_id", quiz.id)
      .eq("difficulty", level)
      .eq("is_approved", true);
    if (usedIds.length > 0) {
      query = query.not("id", "in", `(${usedIds.join(",")})`);
    }
    const { data: candidates } = await query;
    if (candidates && candidates.length > 0) {
      chosenQuestion = candidates[Math.floor(Math.random() * candidates.length)];
      break;
    }
  }

  if (!chosenQuestion) {
    const finalized = await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({
      done: true,
      reason: "pool_exhausted",
      message: "No more questions are available at any difficulty level. Your quiz has been submitted early.",
      ...finalized,
    });
  }

  const { data: options } = await supabase
    .from("options")
    .select("id, option_text")
    .eq("question_id", chosenQuestion.id);

  const shuffled = [...(options ?? [])].sort(() => Math.random() - 0.5);

  return NextResponse.json({
    done: false,
    questionId: chosenQuestion.id,
    questionText: chosenQuestion.question_text,
    scenarioText: chosenQuestion.scenario_text,
    difficulty: chosenQuestion.difficulty,
    options: shuffled.map((option) => ({ id: option.id, text: option.option_text })),
    questionNumber: attempt.questionsAnswered + 1,
    totalQuestions: quiz.questionsToShow,
    secondsRemaining,
    currentDifficulty: attempt.currentDifficulty,
  });
}
