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
    .select("id, status, current_difficulty, time_remaining_seconds, questions_answered")
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
    return {
      ok: true,
      quiz: eligibleQuiz,
      attemptsUsed,
      inProgressAttempt: {
        id: inProgressRow.id,
        currentDifficulty: inProgressRow.current_difficulty,
        timeRemainingSeconds: inProgressRow.time_remaining_seconds ?? 0,
        questionsAnswered: inProgressRow.questions_answered,
      },
    };
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
