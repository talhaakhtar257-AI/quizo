"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import type { Enums } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type Difficulty = Enums<"difficulty_level">;
type DifficultyMode = Enums<"quiz_difficulty_mode">;

export interface QuizInput {
  title: string;
  description: string;
  courseId: string;
  timerMinutes: number;
  passingPercent: number;
  questionsToShow: number;
  difficultyMode: DifficultyMode;
  maxAttempts: number;
  isPublished: boolean;
}

function levelLabel(level: Difficulty): string {
  return level[0].toUpperCase() + level.slice(1);
}

async function assertPublishable(
  supabase: SupabaseClient,
  quizId: string | null,
  questionsToShow: number,
  difficultyMode: DifficultyMode
) {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

  if (quizId) {
    const { data } = await supabase
      .from("questions")
      .select("difficulty")
      .eq("quiz_id", quizId)
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

  const modeLabel =
    difficultyMode === "adaptive" ? "Adaptive" : `${levelLabel(levels[0])} only`;
  const scope = difficultyMode === "adaptive" ? "per level" : "at that level";

  throw new Error(
    `Cannot publish. ${modeLabel} mode showing ${questionsToShow} questions needs ${questionsToShow} approved ${scope}. You have: ${detail}.`
  );
}

export async function createQuiz(input: QuizInput) {
  const supabase = await requireAdmin();

  if (input.isPublished) {
    await assertPublishable(supabase, null, input.questionsToShow, input.difficultyMode);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      course_id: input.courseId,
      title: input.title,
      description: input.description || null,
      timer_minutes: input.timerMinutes,
      passing_percent: input.passingPercent,
      questions_to_show: input.questionsToShow,
      difficulty_mode: input.difficultyMode,
      max_attempts: input.maxAttempts,
      is_published: input.isPublished,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/quizzes");
  return data;
}

export async function updateQuiz(quizId: string, input: QuizInput) {
  const supabase = await requireAdmin();

  if (input.isPublished) {
    await assertPublishable(supabase, quizId, input.questionsToShow, input.difficultyMode);
  }

  const { error } = await supabase
    .from("quizzes")
    .update({
      course_id: input.courseId,
      title: input.title,
      description: input.description || null,
      timer_minutes: input.timerMinutes,
      passing_percent: input.passingPercent,
      questions_to_show: input.questionsToShow,
      difficulty_mode: input.difficultyMode,
      max_attempts: input.maxAttempts,
      is_published: input.isPublished,
    })
    .eq("id", quizId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${quizId}/settings`);
}

export async function getQuizDeleteImpact(quizId: string) {
  const supabase = await requireAdmin();

  const { count: questionCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  const { count: assignmentCount } = await supabase
    .from("quiz_assignments")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  const { count: attemptCount } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  return {
    questionCount: questionCount ?? 0,
    assignmentCount: assignmentCount ?? 0,
    attemptCount: attemptCount ?? 0,
  };
}

export async function deleteQuiz(quizId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/quizzes");
}
