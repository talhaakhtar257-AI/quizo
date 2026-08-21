"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";

export async function assignQuiz(quizId: string, userIds: string[], deadline: string | null) {
  const supabase = await requireAdmin();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("is_published")
    .eq("id", quizId)
    .maybeSingle();

  if (!quiz) throw new Error("Quiz not found.");
  if (!quiz.is_published) throw new Error("Publish this quiz before assigning.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("quiz_assignments")
    .select("user_id")
    .eq("quiz_id", quizId)
    .in("user_id", userIds);

  const alreadyAssigned = new Set((existing ?? []).map((row) => row.user_id));
  const toInsert = userIds.filter((id) => !alreadyAssigned.has(id));

  if (toInsert.length === 0) {
    throw new Error("All selected students are already assigned to this quiz.");
  }

  const { error } = await supabase.from("quiz_assignments").insert(
    toInsert.map((userId) => ({
      quiz_id: quizId,
      user_id: userId,
      deadline,
      assigned_by: user?.id,
    }))
  );

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/quizzes/${quizId}/assign`);
  return { assignedCount: toInsert.length, skippedCount: alreadyAssigned.size };
}

export async function getUnassignImpact(quizId: string, userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId)
    .eq("user_id", userId);

  return { attemptCount: count ?? 0 };
}

export async function unassignQuiz(quizId: string, userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("quiz_assignments")
    .delete()
    .eq("quiz_id", quizId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/quizzes/${quizId}/assign`);
}

export async function getPublishedQuizzesForAssignment() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quizzes")
    .select("id, title, courses(title)")
    .eq("is_published", true)
    .order("title", { ascending: true });

  return (data ?? []).map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    courseTitle: quiz.courses?.title ?? "—",
  }));
}
