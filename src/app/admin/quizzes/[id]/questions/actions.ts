"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import type { Enums } from "@/types/database";

export interface QuestionFilters {
  difficulty: Enums<"difficulty_level"> | "all";
  approval: "all" | "approved" | "pending";
  search: string;
}

const PAGE_SIZE = 20;

// Shared by createManualQuestion and updateQuestion: the client form already
// enforces this (NewQuestionForm.tsx), but a Server Action is directly
// POST-able independent of the form that rendered it, so a malformed
// question must never be able to reach the database — especially since a
// manually-written question is auto-approved on creation and can be served
// to a real student immediately, with no review gate.
function validateQuestionInput(input: {
  questionType: Enums<"question_type">;
  scenarioText: string;
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
}): string | null {
  if (input.questionText.trim().length < 10) {
    return "Question text must be at least 10 characters.";
  }
  if (input.questionType === "scenario" && !input.scenarioText.trim()) {
    return "Scenario text is required for a scenario question.";
  }
  if (input.options.length !== 4) {
    return "A question must have exactly 4 options.";
  }
  const trimmed = input.options.map((option) => option.text.trim());
  if (trimmed.some((text) => !text)) {
    return "All 4 options must be filled in.";
  }
  const lower = trimmed.map((text) => text.toLowerCase());
  if (new Set(lower).size !== lower.length) {
    return "Options must not be duplicates of each other.";
  }
  const correctCount = input.options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    return "Exactly one option must be marked correct.";
  }
  return null;
}

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

export async function approveQuestion(quizId: string, questionId: string) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("questions")
    .update({ is_approved: true })
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Question not found in this quiz.");
}

export async function deleteQuestion(quizId: string, questionId: string) {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("quiz_id", quizId)
    .select("id");
  if (error) {
    if (error.code === "23503") {
      throw new Error("This question has already been answered by a student and can't be deleted.");
    }
    throw new Error(error.message);
  }
  if (!data || data.length === 0) throw new Error("Question not found in this quiz.");
}

export async function bulkApprove(quizId: string, ids: string[]) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("questions")
    .update({ is_approved: true })
    .in("id", ids)
    .eq("quiz_id", quizId);
  if (error) throw new Error(error.message);
}

export async function bulkDelete(quizId: string, ids: string[]) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("questions")
    .delete()
    .in("id", ids)
    .eq("quiz_id", quizId);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "One or more of these questions have already been answered by a student and can't be deleted."
      );
    }
    throw new Error(error.message);
  }
}

export interface UpdateQuestionInput {
  difficulty: Enums<"difficulty_level">;
  scenarioText: string;
  questionText: string;
  explanation: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export async function updateQuestion(questionId: string, input: UpdateQuestionInput) {
  const supabase = await requireAdmin();

  // Existing questions can be scenario or direct-question type; scenario
  // text is only required when the question already has one. Re-derive the
  // effective type the same way the shared validator expects it.
  const validationError = validateQuestionInput({
    questionType: input.scenarioText.trim() ? "scenario" : "mcq",
    scenarioText: input.scenarioText,
    questionText: input.questionText,
    options: input.options,
  });
  if (validationError) throw new Error(validationError);

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
  const supabase = await requireAdmin();

  const validationError = validateQuestionInput(input);
  if (validationError) throw new Error(validationError);

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
