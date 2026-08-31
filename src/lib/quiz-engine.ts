import { createServiceClient } from "@/lib/supabase/service";

export type Difficulty = "easy" | "medium" | "hard";
export type DifficultyMode = "adaptive" | "easy_only" | "medium_only" | "hard_only";
export type AttemptStatus = "in_progress" | "submitted" | "timed_out";
export type OptionKey = "a" | "b" | "c" | "d";
export type ServiceClient = ReturnType<typeof createServiceClient>;

const LADDER: Difficulty[] = ["easy", "medium", "hard"];
export const OPTION_KEYS: OptionKey[] = ["a", "b", "c", "d"];

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
// stay — at its one allowed level.
export function initialDifficulty(mode: DifficultyMode): Difficulty {
  return mode === "adaptive" ? "easy" : (mode.replace("_only", "") as Difficulty);
}

export function levelLabel(level: Difficulty): string {
  return level[0].toUpperCase() + level.slice(1);
}

// pool_questions has no quiz_id of its own — it belongs to a quiz_pools row,
// which is what actually references the quiz (one pool per quiz).
export async function resolvePoolId(supabase: ServiceClient, quizId: string): Promise<string | null> {
  const { data } = await supabase.from("quiz_pools").select("id").eq("quiz_id", quizId).maybeSingle();
  return data?.id ?? null;
}

export async function countApprovedQuestions(
  supabase: ServiceClient,
  quizId: string
): Promise<Record<Difficulty, number>> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const poolId = await resolvePoolId(supabase, quizId);
  if (!poolId) return counts;

  const { data } = await supabase
    .from("pool_questions")
    .select("difficulty")
    .eq("pool_id", poolId)
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
// counter, so there is nothing to drift and no client value to trust. A
// null time limit means the quiz has no timer at all — never expires.
export function computeSecondsRemaining(timeLimitMinutes: number | null, startedAt: string): number {
  if (timeLimitMinutes === null) return Number.MAX_SAFE_INTEGER;
  const totalSeconds = timeLimitMinutes * 60;
  const elapsedSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, totalSeconds - elapsedSeconds);
}

function generateCertificateNumber(): string {
  const digits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `QZ-${new Date().getFullYear()}-${digits}`;
}

export interface FinalizedAttempt {
  score: number;
  totalCorrect: number;
  totalQuestions: number;
  passed: boolean;
  isBest: boolean;
  certificateId: string | null;
}

// After finalizing an attempt, best-of-N (rule 17) means exactly one
// submitted attempt per (quiz, student) is flagged is_best_attempt — the
// highest score, earliest started_at on a tie. Re-run on every finalize
// rather than compared incrementally, since a later, lower-scoring retake
// must never demote an earlier winner just for being newer.
async function recomputeBestAttempt(
  supabase: ServiceClient,
  quizId: string,
  studentId: string
): Promise<string | null> {
  const { data: submitted } = await supabase
    .from("quiz_attempts")
    .select("id, score, started_at")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .eq("status", "submitted");

  if (!submitted || submitted.length === 0) return null;

  const winner = submitted.reduce((best, row) => {
    const bestScore = best.score ?? -1;
    const rowScore = row.score ?? -1;
    if (rowScore > bestScore) return row;
    if (rowScore === bestScore && new Date(row.started_at) < new Date(best.started_at)) return row;
    return best;
  });

  await supabase
    .from("quiz_attempts")
    .update({ is_best_attempt: false })
    .eq("quiz_id", quizId)
    .eq("student_id", studentId)
    .neq("id", winner.id);
  await supabase.from("quiz_attempts").update({ is_best_attempt: true }).eq("id", winner.id);

  return winner.id;
}

// Scores the attempt from its saved answers, marks it submitted, recomputes
// best-of-N, and issues a certificate on a pass. Idempotent: calling it
// again on an already-submitted attempt just returns the stored result, and
// a status='in_progress' guard on the update protects against two requests
// (e.g. a heartbeat and next-question hitting expiry at once) finalizing
// the same attempt twice.
export async function finalizeAttempt(
  supabase: ServiceClient,
  attemptId: string
): Promise<FinalizedAttempt> {
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select(
      "id, organization_id, quiz_id, student_id, status, score, total_correct, total_questions, started_at, is_best_attempt, quizzes(course_id, passing_score)"
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) throw new Error("Attempt not found.");

  if (attempt.status !== "in_progress") {
    const { data: certificate } = await supabase
      .from("certificates")
      .select("id")
      .eq("attempt_id", attemptId)
      .maybeSingle();
    return {
      score: Number(attempt.score ?? 0),
      totalCorrect: attempt.total_correct ?? 0,
      totalQuestions: attempt.total_questions ?? 0,
      passed: (Number(attempt.score ?? 0)) >= (attempt.quizzes?.passing_score ?? 70),
      isBest: attempt.is_best_attempt ?? false,
      certificateId: certificate?.id ?? null,
    };
  }

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("is_correct")
    .eq("attempt_id", attemptId);

  const totalCorrect = (answers ?? []).filter((answer) => answer.is_correct).length;
  const totalQuestions = answers?.length ?? 0;
  // CLAUDE.md rule 12: every question is worth 1 mark, no difficulty
  // weighting — score is a flat correct/answered ratio.
  const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 1000) / 10 : 0;
  const passingScore = attempt.quizzes?.passing_score ?? 70;
  const passed = score >= passingScore;
  const timeTakenSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
  );

  const { data: updatedRows } = await supabase
    .from("quiz_attempts")
    .update({
      status: "submitted",
      score,
      total_correct: totalCorrect,
      total_questions: totalQuestions,
      time_taken_seconds: timeTakenSeconds,
      time_remaining_seconds: 0,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("status", "in_progress")
    .select("id");

  if (!updatedRows || updatedRows.length === 0) {
    // Another request finalized this attempt in the moment between our read
    // and write — recurse once to return its already-stored result instead
    // of scoring (and certifying) it twice.
    return finalizeAttempt(supabase, attemptId);
  }

  const bestId = await recomputeBestAttempt(supabase, attempt.quiz_id, attempt.student_id);
  const isBest = bestId === attemptId;

  if (await getHasFullAntiCheat(supabase, attempt.organization_id)) {
    await supabase.from("quiz_event_stream").insert({
      organization_id: attempt.organization_id,
      attempt_id: attemptId,
      student_id: attempt.student_id,
      event_type: "quiz_submitted",
      metadata: { score },
    });
  }

  let certificateId: string | null = null;
  if (passed && attempt.quizzes?.course_id) {
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id")
      .eq("quiz_id", attempt.quiz_id)
      .eq("student_id", attempt.student_id)
      .maybeSingle();

    if (existingCert) {
      certificateId = existingCert.id;
    } else {
      for (let tries = 0; tries < 3 && !certificateId; tries++) {
        const { data: inserted, error } = await supabase
          .from("certificates")
          .insert({
            organization_id: attempt.organization_id,
            course_id: attempt.quizzes.course_id,
            quiz_id: attempt.quiz_id,
            student_id: attempt.student_id,
            attempt_id: attemptId,
            score,
            certificate_number: generateCertificateNumber(),
          })
          .select("id")
          .single();
        if (!error && inserted) certificateId = inserted.id;
      }
    }
  }

  return { score, totalCorrect, totalQuestions, passed, isBest, certificateId };
}

export interface AttemptContext {
  attempt: {
    id: string;
    studentId: string;
    quizId: string;
    organizationId: string;
    status: AttemptStatus;
    currentDifficulty: Difficulty;
    questionsAnswered: number;
    startedAt: string;
  };
  quiz: {
    id: string;
    courseId: string;
    timeLimitMinutes: number | null;
    questionsToShow: number;
    passingScore: number;
    difficultyMode: DifficultyMode;
  };
  hasFullAntiCheat: boolean;
}

// Fullscreen lock, copy/paste blocking, response-time flagging, and the
// full quiz_event_stream log are Pro/Institution features (FEATURES.md §7)
// — Free gets tab-switch detection shown to the student but nothing logged.
export async function getHasFullAntiCheat(
  supabase: ServiceClient,
  organizationId: string
): Promise<boolean> {
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) return false;
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("has_anti_cheat_full")
    .eq("plan", org.plan)
    .maybeSingle();
  return limits?.has_anti_cheat_full ?? false;
}

// Shared by every quiz-engine API route: loads the attempt and its quiz in
// one go and verifies the caller actually owns it. RLS is bypassed by the
// service client (students have no direct write access to quiz_attempts at
// all, per the score-forging fix), so this ownership check is what stands
// in for it.
export async function loadAttemptContext(
  supabase: ServiceClient,
  attemptId: string,
  studentId: string
): Promise<{ ok: true; context: AttemptContext } | { ok: false; status: number; error: string }> {
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select(
      "id, student_id, quiz_id, organization_id, status, current_difficulty, questions_answered, started_at, quizzes(id, course_id, time_limit_minutes, questions_to_show, passing_score, difficulty_mode)"
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) return { ok: false, status: 404, error: "Attempt not found." };
  if (attempt.student_id !== studentId) return { ok: false, status: 403, error: "This is not your attempt." };
  if (!attempt.quizzes) return { ok: false, status: 500, error: "Quiz data for this attempt is missing." };

  const hasFullAntiCheat = await getHasFullAntiCheat(supabase, attempt.organization_id);

  return {
    ok: true,
    context: {
      attempt: {
        id: attempt.id,
        studentId: attempt.student_id,
        quizId: attempt.quiz_id,
        organizationId: attempt.organization_id,
        status: attempt.status as AttemptStatus,
        currentDifficulty: attempt.current_difficulty as Difficulty,
        questionsAnswered: attempt.questions_answered,
        startedAt: attempt.started_at,
      },
      hasFullAntiCheat,
      quiz: {
        id: attempt.quizzes.id,
        courseId: attempt.quizzes.course_id,
        timeLimitMinutes: attempt.quizzes.time_limit_minutes,
        questionsToShow: attempt.quizzes.questions_to_show,
        passingScore: attempt.quizzes.passing_score,
        difficultyMode: attempt.quizzes.difficulty_mode as DifficultyMode,
      },
    },
  };
}

export interface EligibleQuiz {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseName: string;
  timeLimitMinutes: number | null;
  passingScore: number;
  questionsToShow: number;
  difficultyMode: DifficultyMode;
  maxAttempts: number;
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
// startAttempt action (to re-verify right before creating the quiz_attempts
// row, in case anything changed between page load and the click). There is
// no separate "assignment" step in this schema — an approved enrollment in
// the quiz's course is what makes a quiz visible at all.
export async function checkEligibility(
  supabase: ServiceClient,
  quizId: string,
  studentId: string
): Promise<EligibilityResult> {
  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, course_id, time_limit_minutes, passing_score, questions_to_show, difficulty_mode, max_attempts, status, courses(name)"
    )
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) return { ok: false, reason: "This quiz does not exist." };

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("course_id", quiz.course_id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!enrollment || enrollment.status !== "approved") {
    return {
      ok: false,
      reason: "You are not an approved student in this quiz's course yet.",
    };
  }

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, status, current_difficulty, questions_answered, started_at")
    .eq("quiz_id", quizId)
    .eq("student_id", studentId);

  const inProgressRow = attempts?.find((attempt) => attempt.status === "in_progress") ?? null;
  const attemptsUsed = attempts?.length ?? 0;

  const eligibleQuiz: EligibleQuiz = {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    courseId: quiz.course_id,
    courseName: quiz.courses?.name ?? "—",
    timeLimitMinutes: quiz.time_limit_minutes,
    passingScore: quiz.passing_score,
    questionsToShow: quiz.questions_to_show,
    difficultyMode: quiz.difficulty_mode as DifficultyMode,
    maxAttempts: quiz.max_attempts,
  };

  if (inProgressRow) {
    const secondsRemaining = computeSecondsRemaining(quiz.time_limit_minutes, inProgressRow.started_at);
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
          currentDifficulty: inProgressRow.current_difficulty as Difficulty,
          timeRemainingSeconds: secondsRemaining,
          questionsAnswered: inProgressRow.questions_answered,
        },
      };
    }
  }

  if (quiz.status !== "published") {
    return { ok: false, reason: "This quiz is not yet available. Check back later." };
  }
  if (quiz.max_attempts !== 0 && attemptsUsed >= quiz.max_attempts) {
    return {
      ok: false,
      reason: `You have used all ${quiz.max_attempts} of your attempts for this quiz.`,
    };
  }

  const counts = await countApprovedQuestions(supabase, quizId);
  const availability = questionAvailabilityDetail(counts, quiz.difficulty_mode as DifficultyMode, quiz.questions_to_show);
  if (!availability.ok) {
    return {
      ok: false,
      reason: `This quiz isn't ready yet — it needs more approved questions (${availability.detail}). Contact your admin.`,
    };
  }

  return { ok: true, quiz: eligibleQuiz, attemptsUsed, inProgressAttempt: null };
}
