import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext, finalizeAttempt } from "@/lib/quiz-engine";

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
  if (result.context.quiz.id !== quizId) {
    return NextResponse.json({ error: "This attempt does not belong to this quiz." }, { status: 400 });
  }

  // finalizeAttempt is idempotent — calling submit on an attempt that
  // next-question or heartbeat already auto-finalized just returns the
  // stored result, never double-scores or double-certifies it.
  const finalized = await finalizeAttempt(supabase, attemptId);

  return NextResponse.json({
    data: {
      score: finalized.score,
      total_correct: finalized.totalCorrect,
      total_questions: finalized.totalQuestions,
      is_best: finalized.isBest,
      passed: finalized.passed,
      certificate_id: finalized.certificateId,
    },
  });
}
