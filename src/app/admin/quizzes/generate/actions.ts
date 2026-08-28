"use server";

import { requireAdmin } from "@/lib/require-admin";

export interface CreateQuizForGenerationInput {
  courseId: string;
  title: string;
  questionsToShow: number;
}

export async function createQuizForGeneration(input: CreateQuizForGenerationInput) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      course_id: input.courseId,
      title: input.title,
      questions_to_show: input.questionsToShow,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
