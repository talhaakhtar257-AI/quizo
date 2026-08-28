import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext, computeSecondsRemaining, finalizeAttempt } from "@/lib/quiz-engine";

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
    return NextResponse.json({ done: true });
  }

  const secondsRemaining = computeSecondsRemaining(quiz.timerMinutes, attempt.startedAt);
  if (secondsRemaining <= 0) {
    await finalizeAttempt(supabase, attemptId);
    return NextResponse.json({ done: true, reason: "time_expired" });
  }

  // Guarded on status: without it, a heartbeat racing a concurrent finalize
  // (another heartbeat hitting expiry, or the quiz completing via
  // submit-answer/next-question) could write a nonzero time back onto a row
  // finalizeAttempt already froze at 0 for a submitted attempt.
  await supabase
    .from("attempts")
    .update({ time_remaining_seconds: secondsRemaining })
    .eq("id", attemptId)
    .eq("status", "in_progress");
  return NextResponse.json({ done: false, secondsRemaining });
}
