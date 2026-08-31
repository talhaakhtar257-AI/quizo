import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadAttemptContext } from "@/lib/quiz-engine";
import type { CheatEventType } from "@/lib/anti-cheat";
import type { Json } from "@/types/database";

interface IncomingEvent {
  type?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

interface RequestBody {
  attempt_id?: string;
  events?: IncomingEvent[];
}

const VALID_TYPES = new Set<CheatEventType>([
  "quiz_started",
  "tab_switch",
  "fullscreen_exit",
  "copy_attempt",
  "paste_attempt",
  "fast_answer",
  "quiz_submitted",
]);

// Client sends events every 30s, batched (docs/API-ROUTES.md), rather than
// one request per event. Only written when the org's plan includes full
// anti-cheat (FEATURES.md §7) — Free students still see the tab-switch
// warning client-side, it's just never logged for the admin report.
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
  const attemptId = body.attempt_id;
  const events = body.events;
  if (!attemptId || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "Missing attempt_id or events." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const result = await loadAttemptContext(supabase, attemptId, currentUser.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!result.context.hasFullAntiCheat) {
    return NextResponse.json({ data: { logged: 0 } });
  }

  const rows = events
    .filter((event) => event.type && VALID_TYPES.has(event.type as CheatEventType))
    .slice(0, 50) // one batch shouldn't ever carry more than this — defensive cap
    .map((event) => ({
      organization_id: result.context.attempt.organizationId,
      attempt_id: attemptId,
      student_id: currentUser.id,
      event_type: event.type as CheatEventType,
      metadata: (event.metadata ?? {}) as Json,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ data: { logged: 0 } });
  }

  const { error } = await supabase.from("quiz_event_stream").insert(rows);
  if (error) {
    return NextResponse.json({ error: "Could not log events." }, { status: 500 });
  }

  return NextResponse.json({ data: { logged: rows.length } });
}
