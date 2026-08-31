"use server";

import { requirePermission } from "@/lib/permissions";

export interface CreateQuizForGenerationInput {
  courseId: string;
  title: string;
  topic: string;
  questionsToShow: number;
}

// Creates the quiz AND its (initially empty) quiz_pools row together —
// pool_multiplier comes from the org's plan (1× Free, 3× Pro/Institution;
// docs/FEATURES.md §4), not something the admin picks. The generate route
// writes pool_questions against this pool as each level finishes.
export async function createQuizForGeneration(input: CreateQuizForGenerationInput) {
  const { supabase, userId, orgId } = await requirePermission("create_quiz");

  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("pool_multiplier")
    .eq("plan", org?.plan ?? "free")
    .single();
  const poolMultiplier = limits?.pool_multiplier ?? 1;

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      organization_id: orgId,
      course_id: input.courseId,
      title: input.title,
      topic: input.topic,
      questions_to_show: input.questionsToShow,
      pool_multiplier: poolMultiplier,
      created_by: userId,
    })
    .select("id")
    .single();

  if (quizError || !quiz) throw new Error("Could not create the quiz. Please try again.");

  const { data: pool, error: poolError } = await supabase
    .from("quiz_pools")
    .insert({
      organization_id: orgId,
      quiz_id: quiz.id,
      total_questions: 0,
      easy_count: 0,
      medium_count: 0,
      hard_count: 0,
    })
    .select("id")
    .single();

  if (poolError || !pool) throw new Error("Quiz was created, but its question pool failed to save.");

  return { quizId: quiz.id, poolId: pool.id, poolMultiplier };
}
