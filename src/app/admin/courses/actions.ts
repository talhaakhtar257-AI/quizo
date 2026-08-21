"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CourseInput {
  title: string;
  description: string;
}

export async function createCourse(input: CourseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("courses").insert({
    title: input.title,
    description: input.description || null,
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
}

export async function updateCourse(courseId: string, input: CourseInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ title: input.title, description: input.description || null })
    .eq("id", courseId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function getCourseDeleteImpact(courseId: string) {
  const supabase = await createClient();

  const { data: quizzes, count: quizCount } = await supabase
    .from("quizzes")
    .select("id", { count: "exact" })
    .eq("course_id", courseId);

  let questionCount = 0;
  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  if (quizIds.length > 0) {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .in("quiz_id", quizIds);
    questionCount = count ?? 0;
  }

  return { quizCount: quizCount ?? 0, questionCount };
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
}
