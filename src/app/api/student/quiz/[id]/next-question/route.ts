import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import {
  loadAttemptContext,
  computeSecondsRemaining,
  finalizeAttempt,
  fallbackOrder,
  resolvePoolId,
  OPTION_KEYS,
  type Difficulty,
} from "@/lib/quiz-engine";

interface RequestBody {
  attempt_id?: string;
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
  const attemptId = body.attempt_id;
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attempt_id." }, { status: 400 });
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
    return NextResponse.json({ data: { done: true, reason: "already_submitted" } });
  }

  const secondsRemaining = computeSecondsRemaining(quiz.timeLimitMinutes, attempt.startedAt);
  if (secondsRemaining <= 0) {
    await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({
      data: { done: true, reason: "time_expired", message: "Time is up. Your quiz has been submitted." },
    });
  }

  if (attempt.questionsAnswered >= quiz.questionsToShow) {
    await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({ data: { done: true, reason: "complete" } });
  }

  const resolvedPoolId = await resolvePoolId(supabase, quizId);
  if (!resolvedPoolId) {
    await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({
      data: {
        done: true,
        reason: "pool_exhausted",
        message: "No questions are available for this quiz. Your quiz has been submitted early.",
      },
    });
  }
  const poolId: string = resolvedPoolId;

  const { data: usedRows } = await supabase
    .from("attempt_answers")
    .select("question_id")
    .eq("attempt_id", attemptId);
  const usedThisAttempt = (usedRows ?? []).map((row) => row.question_id);

  // A student should not see the same question again on a retake as long as
  // the pool has unseen ones left, so the exclusion set spans every attempt
  // this student has made on this quiz, not just the current one.
  const { data: pastAttempts } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("student_id", currentUser.id);
  const pastAttemptIds = (pastAttempts ?? []).map((row) => row.id);
  const { data: seenRows } = pastAttemptIds.length
    ? await supabase.from("attempt_answers").select("question_id").in("attempt_id", pastAttemptIds)
    : { data: [] as { question_id: string }[] };
  const seenAcrossAttempts = Array.from(
    new Set([...usedThisAttempt, ...(seenRows ?? []).map((row) => row.question_id)])
  );

  type Candidate = {
    id: string;
    difficulty: Difficulty;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  };

  async function findQuestion(excludeIds: string[]): Promise<Candidate | null> {
    for (const level of fallbackOrder(attempt.currentDifficulty)) {
      let query = supabase
        .from("pool_questions")
        .select("id, difficulty, question_text, option_a, option_b, option_c, option_d")
        .eq("pool_id", poolId)
        .eq("difficulty", level)
        .eq("is_approved", true);
      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }
      const { data: candidates } = await query;
      if (candidates && candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)] as Candidate;
      }
    }
    return null;
  }

  // Prefer a question this student has never seen on this quiz before. If
  // every approved question at every fallback level has already been shown
  // across their past attempts, fall back to allowing repeats — but a
  // question already used in THIS attempt is still never repeated.
  const chosenQuestion =
    (await findQuestion(seenAcrossAttempts)) ?? (await findQuestion(usedThisAttempt));

  if (!chosenQuestion) {
    await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({
      data: {
        done: true,
        reason: "pool_exhausted",
        message: "No more questions are available at any difficulty level. Your quiz has been submitted early.",
      },
    });
  }

  const optionText: Record<string, string> = {
    a: chosenQuestion.option_a,
    b: chosenQuestion.option_b,
    c: chosenQuestion.option_c,
    d: chosenQuestion.option_d,
  };
  const shuffledKeys = [...OPTION_KEYS].sort(() => Math.random() - 0.5);

  return NextResponse.json({
    data: {
      question_id: chosenQuestion.id,
      question_text: chosenQuestion.question_text,
      options: shuffledKeys.map((key) => ({ key, text: optionText[key] })),
      difficulty: chosenQuestion.difficulty,
      question_number: attempt.questionsAnswered + 1,
      questions_to_show: quiz.questionsToShow,
      time_remaining_seconds: secondsRemaining,
    },
  });
}
