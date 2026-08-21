"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export interface QuestionFilters {
  difficulty: Enums<"difficulty_level"> | "all";
  approval: "all" | "approved" | "pending";
  search: string;
}

const PAGE_SIZE = 20;

export async function fetchQuestions(
  quizId: string,
  filters: QuestionFilters,
  offset: number
) {
  const supabase = await createClient();

  let query = supabase
    .from("questions")
    .select(
      "id, difficulty, scenario_text, question_text, explanation, is_approved, options(id, option_text, is_correct, option_order)"
    )
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: true })
    .order("option_order", { referencedTable: "options" })
    // fetch one extra row so we can tell if there's another page
    .range(offset, offset + PAGE_SIZE);

  if (filters.difficulty !== "all") {
    query = query.eq("difficulty", filters.difficulty);
  }
  if (filters.approval !== "all") {
    query = query.eq("is_approved", filters.approval === "approved");
  }
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`question_text.ilike.${term},scenario_text.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  return { questions: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore };
}

export async function approveQuestion(questionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update({ is_approved: true })
    .eq("id", questionId);
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
}

export async function bulkApprove(ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("questions")
    .update({ is_approved: true })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

export async function bulkDelete(ids: string[]) {
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().in("id", ids);
  if (error) throw new Error(error.message);
}

export interface UpdateQuestionInput {
  difficulty: Enums<"difficulty_level">;
  scenarioText: string;
  questionText: string;
  explanation: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export async function updateQuestion(questionId: string, input: UpdateQuestionInput) {
  const supabase = await createClient();

  const { error: questionError } = await supabase
    .from("questions")
    .update({
      difficulty: input.difficulty,
      scenario_text: input.scenarioText,
      question_text: input.questionText,
      explanation: input.explanation,
    })
    .eq("id", questionId);
  if (questionError) throw new Error(questionError.message);

  for (const option of input.options) {
    const { error } = await supabase
      .from("options")
      .update({ option_text: option.text, is_correct: option.isCorrect })
      .eq("id", option.id);
    if (error) throw new Error(error.message);
  }
}

export interface CreateManualQuestionInput {
  questionType: Enums<"question_type">;
  difficulty: Enums<"difficulty_level">;
  scenarioText: string;
  questionText: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
}

export async function createManualQuestion(quizId: string, input: CreateManualQuestionInput) {
  const supabase = await createClient();

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .insert({
      quiz_id: quizId,
      difficulty: input.difficulty,
      question_type: input.questionType,
      scenario_text: input.questionType === "scenario" ? input.scenarioText : null,
      question_text: input.questionText,
      explanation: input.explanation,
      is_approved: true,
      generated_by_ai: false,
    })
    .select("id")
    .single();

  if (questionError || !question) {
    throw new Error(questionError?.message ?? "Could not save the question.");
  }

  const { error: optionsError } = await supabase.from("options").insert(
    input.options.map((option, index) => ({
      question_id: question.id,
      option_text: option.text,
      is_correct: option.isCorrect,
      option_order: index + 1,
    }))
  );

  if (optionsError) {
    throw new Error("The question was saved but its options could not be saved.");
  }

  revalidatePath(`/admin/quizzes/${quizId}/questions`);
  return question;
}
