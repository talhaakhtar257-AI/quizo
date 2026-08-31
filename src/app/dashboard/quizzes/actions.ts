"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { requirePermission, assertPermission } from "@/lib/permissions";
import { planLimitError } from "@/lib/plan-limits";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Difficulty = "easy" | "medium" | "hard";
type DifficultyMode = "adaptive" | "easy_only" | "medium_only" | "hard_only";

export interface QuizInput {
  title: string;
  topic: string;
  description: string;
  courseId: string;
  timeLimitMinutes: number;
  passingScore: number;
  questionsToShow: number;
  difficultyMode: DifficultyMode;
  maxAttempts: number;
  publishNow: boolean;
}

function levelLabel(level: Difficulty): string {
  return level[0].toUpperCase() + level.slice(1);
}

// docs/FEATURES.md §5: adaptive needs questionsToShow approved at EACH of
// the three levels; a locked mode needs that many at just its one level.
async function assertPublishable(
  supabase: SupabaseClient,
  quizId: string,
  questionsToShow: number,
  difficultyMode: DifficultyMode
) {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

  const { data: pool } = await supabase.from("quiz_pools").select("id").eq("quiz_id", quizId).maybeSingle();
  if (pool) {
    const { data } = await supabase
      .from("pool_questions")
      .select("difficulty")
      .eq("pool_id", pool.id)
      .eq("is_approved", true);
    for (const row of data ?? []) {
      counts[row.difficulty as Difficulty] += 1;
    }
  }

  const levels: Difficulty[] =
    difficultyMode === "adaptive"
      ? ["easy", "medium", "hard"]
      : [difficultyMode.replace("_only", "") as Difficulty];

  const short = levels.some((level) => counts[level] < questionsToShow);
  if (!short) return;

  const detail = levels
    .map((level) => {
      const have = counts[level];
      return have >= questionsToShow
        ? `${levelLabel(level)} ${have} OK`
        : `${levelLabel(level)} ${have} (need ${questionsToShow - have} more)`;
    })
    .join(", ");

  const modeLabel = difficultyMode === "adaptive" ? "Adaptive" : `${levelLabel(levels[0])} only`;
  const scope = difficultyMode === "adaptive" ? "per level" : "at that level";

  throw new Error(
    `Cannot publish. ${modeLabel} mode showing ${questionsToShow} questions needs ${questionsToShow} approved ${scope}. You have: ${detail}.`
  );
}

// docs/FEATURES.md §5: when the creator IS the sole admin (no sub-admins
// yet in the org), a quiz can go straight from draft to published, skipping
// in_review. Phase N (sub-admins) isn't built yet, so every org currently
// has zero sub_admin_permissions rows and always qualifies — this is
// already correct, not a placeholder, for exactly that reason.
async function resolveTargetStatus(
  supabase: SupabaseClient,
  orgId: string,
  publishNow: boolean
): Promise<"draft" | "published" | "in_review"> {
  if (!publishNow) return "draft";
  const { count } = await supabase
    .from("sub_admin_permissions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return (count ?? 0) === 0 ? "published" : "in_review";
}

// docs/FEATURES.md §11: "Start attempt" is capped by plan_limits.max_quiz_attempts —
// Free can't configure a quiz with more retakes (or unlimited, maxAttempts = 0) than
// its plan allows. -1 means the plan has no ceiling (Institution).
function assertMaxAttemptsWithinPlan(plan: string, maxQuizAttemptsLimit: number, maxAttempts: number) {
  if (maxQuizAttemptsLimit === -1) return;
  if (maxAttempts === 0 || maxAttempts > maxQuizAttemptsLimit) {
    throw planLimitError(
      `The ${plan} plan allows at most ${maxQuizAttemptsLimit} attempt${maxQuizAttemptsLimit === 1 ? "" : "s"} per quiz. Lower "Max attempts" or upgrade.`
    );
  }
}

export async function createQuiz(input: QuizInput) {
  const ctx = await requirePermission("create_quiz");
  const { supabase, userId, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  const plan = org?.plan ?? "free";
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("pool_multiplier, max_quiz_attempts")
    .eq("plan", plan)
    .single();

  assertMaxAttemptsWithinPlan(plan, limits?.max_quiz_attempts ?? -1, input.maxAttempts);

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({
      organization_id: orgId,
      course_id: input.courseId,
      title: input.title,
      topic: input.topic,
      description: input.description || null,
      time_limit_minutes: input.timeLimitMinutes,
      passing_score: input.passingScore,
      questions_to_show: input.questionsToShow,
      pool_multiplier: limits?.pool_multiplier ?? 1,
      difficulty_mode: input.difficultyMode,
      max_attempts: input.maxAttempts,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !quiz) throw new Error("Could not create the quiz. Please try again.");

  if (input.publishNow) {
    await assertPermission(ctx, "approve_quiz");
    await assertPublishable(supabase, quiz.id, input.questionsToShow, input.difficultyMode);
    const status = await resolveTargetStatus(supabase, orgId, true);
    await supabase
      .from("quizzes")
      .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
      .eq("id", quiz.id);
  }

  revalidatePath("/dashboard/quizzes");
  return quiz;
}

export async function updateQuiz(quizId: string, input: QuizInput) {
  const ctx = await requirePermission("create_quiz");
  const { supabase, orgId } = ctx;

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  const plan = org?.plan ?? "free";
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("max_quiz_attempts")
    .eq("plan", plan)
    .single();
  assertMaxAttemptsWithinPlan(plan, limits?.max_quiz_attempts ?? -1, input.maxAttempts);

  let status: "draft" | "published" | "in_review" = "draft";
  if (input.publishNow) {
    await assertPermission(ctx, "approve_quiz");
    await assertPublishable(supabase, quizId, input.questionsToShow, input.difficultyMode);
    status = await resolveTargetStatus(supabase, orgId, true);
  }

  const { error } = await supabase
    .from("quizzes")
    .update({
      course_id: input.courseId,
      title: input.title,
      topic: input.topic,
      description: input.description || null,
      time_limit_minutes: input.timeLimitMinutes,
      passing_score: input.passingScore,
      questions_to_show: input.questionsToShow,
      difficulty_mode: input.difficultyMode,
      max_attempts: input.maxAttempts,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .eq("id", quizId);

  if (error) throw new Error("Could not save. Please try again.");
  revalidatePath("/dashboard/quizzes");
  revalidatePath(`/dashboard/quizzes/${quizId}/settings`);
}

export async function archiveQuiz(quizId: string) {
  const { supabase } = await requirePermission("approve_quiz");
  const { error } = await supabase.from("quizzes").update({ status: "archived" }).eq("id", quizId);
  if (error) throw new Error("Could not archive this quiz.");
  revalidatePath("/dashboard/quizzes");
}

export async function getQuizDeleteImpact(quizId: string) {
  const supabase = await requireAdmin();

  const { data: pool } = await supabase.from("quiz_pools").select("id").eq("quiz_id", quizId).maybeSingle();
  let questionCount = 0;
  if (pool) {
    const { count } = await supabase
      .from("pool_questions")
      .select("id", { count: "exact", head: true })
      .eq("pool_id", pool.id);
    questionCount = count ?? 0;
  }

  const { count: attemptCount } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  return { questionCount, attemptCount: attemptCount ?? 0 };
}

// No dedicated "delete_quiz" permission exists in the matrix (docs/SCHEMA.md
// Table 4) — deleting is the more destructive of the two quiz-lifecycle
// actions, so it's gated on approve_quiz rather than the lesser create_quiz.
export async function deleteQuiz(quizId: string) {
  const { supabase } = await requirePermission("approve_quiz");
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw new Error("Could not delete this quiz. Please try again.");
  revalidatePath("/dashboard/quizzes");
}
