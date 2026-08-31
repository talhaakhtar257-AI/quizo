import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext, computeSecondsRemaining, finalizeAttempt } from "@/lib/quiz-engine";

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
    return NextResponse.json({ data: { done: true } });
  }

  const secondsRemaining = computeSecondsRemaining(quiz.timeLimitMinutes, attempt.startedAt);
  if (secondsRemaining <= 0) {
    await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({ data: { done: true, reason: "time_expired" } });
  }

  // Guarded on status: without it, a heartbeat racing a concurrent finalize
  // (another heartbeat hitting expiry, or the quiz completing via
  // submit-answer/next-question) could write a nonzero time back onto a row
  // finalizeAttempt already froze at 0 for a submitted attempt.
  await supabase
    .from("quiz_attempts")
    .update({ time_remaining_seconds: secondsRemaining })
    .eq("id", attemptId)
    .eq("status", "in_progress");

  return NextResponse.json({ data: { done: false, time_remaining_seconds: secondsRemaining } });
}
