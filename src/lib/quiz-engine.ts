import { createServiceClient } from "@/lib/supabase/service";
import type { Enums } from "@/types/database";

export type Difficulty = Enums<"difficulty_level">;
export type DifficultyMode = Enums<"quiz_difficulty_mode">;
export type ServiceClient = ReturnType<typeof createServiceClient>;

const LADDER: Difficulty[] = ["easy", "medium", "hard"];

export function nextDifficulty(
  current: Difficulty,
  wasCorrect: boolean,
  mode: DifficultyMode
): Difficulty {
  if (mode !== "adaptive") return current;
  const index = LADDER.indexOf(current);
  return wasCorrect
    ? LADDER[Math.min(index + 1, LADDER.length - 1)]
    : LADDER[Math.max(index - 1, 0)];
}

// When the pool at the current difficulty is empty, try these levels in
// order: Easy falls forward to Medium, Hard falls back to Medium, and
// Medium (having nowhere adjacent-and-unused of its own kind) tries Easy
// then Hard.
export function fallbackOrder(current: Difficulty): Difficulty[] {
  if (current === "easy") return ["easy", "medium"];
  if (current === "hard") return ["hard", "medium"];
  return ["medium", "easy", "hard"];
}

export function requiredLevels(mode: DifficultyMode): Difficulty[] {
  return mode === "adaptive" ? ["easy", "medium", "hard"] : [mode.replace("_only", "") as Difficulty];
}

// An adaptive attempt always starts at Easy. A locked mode (easy_only /
// medium_only / hard_only) must start — and, per nextDifficulty() above,
// stay — at its one allowed level; starting it at "easy" regardless of mode
// would send medium_only/hard_only attempts straight into
// fallbackOrder("easy") = [easy, medium], which never even tries "hard",
// ending a hard_only attempt before it serves a single question.
export function initialDifficulty(mode: DifficultyMode): Difficulty {
  return mode === "adaptive" ? "easy" : (mode.replace("_only", "") as Difficulty);
}

export function levelLabel(level: Difficulty): string {
  return level[0].toUpperCase() + level.slice(1);
}

export async function countApprovedQuestions(
  supabase: ServiceClient,
  quizId: string
): Promise<Record<Difficulty, number>> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const { data } = await supabase
    .from("questions")
    .select("difficulty")
    .eq("quiz_id", quizId)
    .eq("is_approved", true);
  for (const row of data ?? []) counts[row.difficulty as Difficulty] += 1;
  return counts;
}

export function questionAvailabilityDetail(
  counts: Record<Difficulty, number>,
  mode: DifficultyMode,
  questionsToShow: number
): { ok: boolean; detail: string } {
  const levels = requiredLevels(mode);
  const short = levels.some((level) => counts[level] < questionsToShow);
  const detail = levels.map((level) => `${levelLabel(level)} ${counts[level]}`).join(", ");
  return { ok: !short, detail };
}

// The server clock is the only source of truth for time remaining — it is
// always recomputed from started_at rather than trusted from a stored
// counter, so there is nothing to drift and no client value to trust.
export function computeSecondsRemaining(timerMinutes: number, startedAt: string): number {
  const totalSeconds = timerMinutes * 60;
  const elapsedSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, totalSeconds - elapsedSeconds);
}

function generateCertificateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous-looking characters
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CERT-${new Date().getFullYear()}-${code}`;
}

export interface FinalizedAttempt {
  percentage: number;
  passed: boolean;
  score: number;
  totalQuestions: number;
}

// Scores the attempt from its saved answers, marks it submitted, and issues
// a certificate on a pass. Idempotent: calling it again on an
// already-submitted attempt just returns the stored result, and a
// status='in_progress' guard on the update protects against two requests
// (e.g. a heartbeat and next-question) finalizing the same attempt at once.
export async function finalizeAttempt(
  supabase: ServiceClient,
  attemptId: string
): Promise<FinalizedAttempt> {
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, user_id, status, score, percentage, passed, total_questions, quizzes(passing_percent)")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) throw new Error("Attempt not found.");

  if (attempt.status !== "in_progress") {
    return {
      percentage: attempt.percentage ?? 0,
      passed: attempt.passed ?? false,
      score: attempt.score ?? 0,
      totalQuestions: attempt.total_questions ?? 0,
    };
  }

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("is_correct")
    .eq("attempt_id", attemptId);

  const score = (answers ?? []).filter((answer) => answer.is_correct).length;
  const totalQuestions = answers?.length ?? 0;
  // Clamped defensively even though score/totalQuestions is already bounded
  // to [0,1] here — the database also enforces this with a CHECK constraint.
  const percentage =
    totalQuestions > 0 ? Math.min(100, Math.round((score / totalQuestions) * 1000) / 10) : 0;
  const passingPercent = attempt.quizzes?.passing_percent ?? 70;
  const passed = percentage >= passingPercent;

  const { data: updatedRows } = await supabase
    .from("attempts")
    .update({
      status: "submitted",
      score,
      percentage,
      passed,
      total_questions: totalQuestions,
      submitted_at: new Date().toISOString(),
      time_remaining_seconds: 0,
    })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) {
    // Another request finalized this attempt in the moment between our read
    // and write — return its result instead of scoring (and certifying) twice.
    const { data: existing } = await supabase
      .from("attempts")
      .select("score, percentage, passed, total_questions")
      .eq("id", attemptId)
      .single();
    return {
      percentage: existing?.percentage ?? 0,
      passed: existing?.passed ?? false,
      score: existing?.score ?? 0,
      totalQuestions: existing?.total_questions ?? 0,
    };
  }

  if (passed) {
    for (let tries = 0; tries < 3; tries++) {
      const { error } = await supabase.from("certificates").insert({
        attempt_id: attemptId,
        user_id: attempt.user_id,
        certificate_code: generateCertificateCode(),
      });
      if (!error) break;
    }
  }

  return { percentage, passed, score, totalQuestions };
}

export interface AttemptContext {
  attempt: {
    id: string;
    userId: string;
    quizId: string;
    status: Enums<"attempt_status">;
    currentDifficulty: Difficulty;
    questionsAnswered: number;
    startedAt: string;
  };
  quiz: {
    id: string;
    timerMinutes: number;
    questionsToShow: number;
    passingPercent: number;
    difficultyMode: DifficultyMode;
  };
}

// Shared by every quiz-engine API route: loads the attempt and its quiz in
// one go and verifies the caller actually owns it. RLS is bypassed by the
// service client, so this ownership check is the thing standing in for it.
export async function loadAttemptContext(
  supabase: ServiceClient,
  attemptId: string,
  userId: string
): Promise<{ ok: true; context: AttemptContext } | { ok: false; status: number; error: string }> {
  const { data: attempt } = await supabase
    .from("attempts")
    .select(
      "id, user_id, quiz_id, status, current_difficulty, questions_answered, started_at, quizzes(id, timer_minutes, questions_to_show, passing_percent, difficulty_mode)"
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) return { ok: false, status: 404, error: "Attempt not found." };
  if (attempt.user_id !== userId) return { ok: false, status: 403, error: "This is not your attempt." };
  if (!attempt.quizzes) return { ok: false, status: 500, error: "Quiz data for this attempt is missing." };

  return {
    ok: true,
    context: {
      attempt: {
        id: attempt.id,
        userId: attempt.user_id,
        quizId: attempt.quiz_id,
        status: attempt.status,
        currentDifficulty: attempt.current_difficulty,
        questionsAnswered: attempt.questions_answered,
        startedAt: attempt.started_at,
      },
      quiz: {
        id: attempt.quizzes.id,
        timerMinutes: attempt.quizzes.timer_minutes,
        questionsToShow: attempt.quizzes.questions_to_show,
        passingPercent: attempt.quizzes.passing_percent,
        difficultyMode: attempt.quizzes.difficulty_mode,
      },
    },
  };
}

export interface EligibleQuiz {
  id: string;
  title: string;
  description: string | null;
  courseTitle: string;
  timerMinutes: number;
  passingPercent: number;
  questionsToShow: number;
  difficultyMode: DifficultyMode;
  maxAttempts: number;
  isPublished: boolean;
}

export interface InProgressAttempt {
  id: string;
  currentDifficulty: Difficulty;
  timeRemainingSeconds: number;
  questionsAnswered: number;
}

export type EligibilityResult =
  | {
      ok: true;
      quiz: EligibleQuiz;
      attemptsUsed: number;
      inProgressAttempt: InProgressAttempt | null;
    }
  | { ok: false; reason: string };

// Shared by the instructions page (to decide what to render) and the
// startAttempt action (to re-verify right before creating the attempts
// row, in case anything changed between page load and the click).
export async function checkEligibility(
  supabase: ServiceClient,
  quizId: string,
  userId: string
): Promise<EligibilityResult> {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, timer_minutes, passing_percent, questions_to_show, difficulty_mode, max_attempts, is_published, courses(title)"
    )
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return { ok: false, reason: "This quiz does not exist." };

  const { data: assignment } = await supabase
    .from("quiz_assignments")
    .select("id, deadline")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!assignment) return { ok: false, reason: "This quiz has not been assigned to you." };

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, status, current_difficulty, questions_answered, started_at")
    .eq("quiz_id", quizId)
    .eq("user_id", userId);

  const inProgressRow = attempts?.find((attempt) => attempt.status === "in_progress") ?? null;
  const attemptsUsed = attempts?.length ?? 0;

  const eligibleQuiz: EligibleQuiz = {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    courseTitle: quiz.courses?.title ?? "—",
    timerMinutes: quiz.timer_minutes,
    passingPercent: quiz.passing_percent,
    questionsToShow: quiz.questions_to_show,
    difficultyMode: quiz.difficulty_mode,
    maxAttempts: quiz.max_attempts,
    isPublished: quiz.is_published,
  };

  if (inProgressRow) {
    const secondsRemaining = computeSecondsRemaining(quiz.timer_minutes, inProgressRow.started_at);
    // The student never came back before time ran out — close it out now
    // instead of showing a Resume screen for a quiz that's already over.
    if (secondsRemaining <= 0) {
      await finalizeAttempt(supabase, inProgressRow.id);
    } else {
      return {
        ok: true,
        quiz: eligibleQuiz,
        attemptsUsed,
        inProgressAttempt: {
          id: inProgressRow.id,
          currentDifficulty: inProgressRow.current_difficulty,
          timeRemainingSeconds: secondsRemaining,
          questionsAnswered: inProgressRow.questions_answered,
        },
      };
    }
  }

  if (!quiz.is_published) {
    return { ok: false, reason: "This quiz is not yet available. Check back later." };
  }
  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    return { ok: false, reason: "The deadline for this quiz has passed." };
  }
  if (quiz.max_attempts !== 0 && attemptsUsed >= quiz.max_attempts) {
    return {
      ok: false,
      reason: `You have used all ${quiz.max_attempts} of your attempts for this quiz.`,
    };
  }

  const counts = await countApprovedQuestions(supabase, quizId);
  const availability = questionAvailabilityDetail(counts, quiz.difficulty_mode, quiz.questions_to_show);
  if (!availability.ok) {
    return {
      ok: false,
      reason: `This quiz isn't ready yet — it needs more approved questions (${availability.detail}). Contact your admin.`,
    };
  }

  return { ok: true, quiz: eligibleQuiz, attemptsUsed, inProgressAttempt: null };
}
