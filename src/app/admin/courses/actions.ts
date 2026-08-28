"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export interface CourseInput {
  title: string;
  description: string;
}

export async function createCourse(input: CourseInput) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title: input.title,
      description: input.description || null,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
  return data;
}

export async function updateCourse(courseId: string, input: CourseInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("courses")
    .update({ title: input.title, description: input.description || null })
    .eq("id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function getCourseDeleteImpact(courseId: string) {
  const supabase = await requireAdmin();

  const { data: quizzes, count: quizCount } = await supabase
    .from("quizzes")
    .select("id", { count: "exact" })
    .eq("course_id", courseId);

  let questionCount = 0;
  let attemptCount = 0;
  let certificateCount = 0;
  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  if (quizIds.length > 0) {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .in("quiz_id", quizIds);
    questionCount = count ?? 0;

    const { data: attempts, count: attemptCountResult } = await supabase
      .from("attempts")
      .select("id", { count: "exact" })
      .in("quiz_id", quizIds);
    attemptCount = attemptCountResult ?? 0;

    const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
    if (attemptIds.length > 0) {
      const { count } = await supabase
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .in("attempt_id", attemptIds);
      certificateCount = count ?? 0;
    }
  }

  return { quizCount: quizCount ?? 0, questionCount, attemptCount, certificateCount };
}

export async function deleteCourse(courseId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
}
