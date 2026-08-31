"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions";

export type Difficulty = "easy" | "medium" | "hard";
const LETTERS = ["a", "b", "c", "d"] as const;
type Letter = (typeof LETTERS)[number];

export interface QuestionFilters {
  difficulty: Difficulty | "all";
  approval: "all" | "approved" | "pending";
  search: string;
}

const PAGE_SIZE = 20;

// pool_questions stores 4 options as flat columns (option_a..option_d) plus
// a correct_option letter, not a sub-table — every function here converts
// between that flat shape and the array-of-4-options shape the UI works
// with (QuestionCard.tsx), using the letter itself as each option's id
// since there's no per-option row id to key on.
interface PoolQuestionRow {
  id: string;
  difficulty: Difficulty;
  question_text: string;
  explanation: string | null;
  is_approved: boolean;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

function toClientQuestion(row: PoolQuestionRow) {
  const optionText: Record<Letter, string> = {
    a: row.option_a,
    b: row.option_b,
    c: row.option_c,
    d: row.option_d,
  };
  return {
    id: row.id,
    difficulty: row.difficulty,
    question_text: row.question_text,
    explanation: row.explanation ?? "",
    is_approved: row.is_approved,
    options: LETTERS.map((letter) => ({
      id: letter,
      option_text: optionText[letter],
      is_correct: row.correct_option === letter,
      option_order: LETTERS.indexOf(letter) + 1,
    })),
  };
}

async function resolvePoolId(supabase: Awaited<ReturnType<typeof createClient>>, quizId: string) {
  const { data } = await supabase.from("quiz_pools").select("id").eq("quiz_id", quizId).maybeSingle();
  return data?.id ?? null;
}

function validateQuestionInput(input: {
  questionText: string;
  options: { text: string; isCorrect: boolean }[];
}): string | null {
  if (input.questionText.trim().length < 10) {
    return "Question text must be at least 10 characters.";
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

export async function fetchQuestions(quizId: string, filters: QuestionFilters, offset: number) {
  const supabase = await createClient();
  const poolId = await resolvePoolId(supabase, quizId);
  if (!poolId) return { questions: [], hasMore: false };

  let query = supabase
    .from("pool_questions")
    .select("id, difficulty, question_text, explanation, is_approved, option_a, option_b, option_c, option_d, correct_option")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: true })
    // fetch one extra row so we can tell if there's another page
    .range(offset, offset + PAGE_SIZE);

  if (filters.difficulty !== "all") {
    query = query.eq("difficulty", filters.difficulty);
  }
  if (filters.approval !== "all") {
    query = query.eq("is_approved", filters.approval === "approved");
  }
  if (filters.search.trim()) {
    query = query.ilike("question_text", `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PoolQuestionRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return { questions: page.map(toClientQuestion), hasMore };
}

export async function approveQuestion(quizId: string, questionId: string) {
  const { supabase } = await requirePermission("approve_quiz");
  const { data, error } = await supabase
    .from("pool_questions")
    .update({ is_approved: true })
    .eq("id", questionId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Question not found in this quiz.");
}

export async function deleteQuestion(quizId: string, questionId: string) {
  const { supabase } = await requirePermission("create_quiz");
  const { data, error } = await supabase.from("pool_questions").delete().eq("id", questionId).select("id");
  if (error) {
    if (error.code === "23503") {
      throw new Error("This question has already been answered by a student and can't be deleted.");
    }
    throw new Error(error.message);
  }
  if (!data || data.length === 0) throw new Error("Question not found in this quiz.");
}

export async function bulkApprove(quizId: string, ids: string[]) {
  const { supabase } = await requirePermission("approve_quiz");
  const { error } = await supabase.from("pool_questions").update({ is_approved: true }).in("id", ids);
  if (error) throw new Error(error.message);
}

export async function bulkDelete(quizId: string, ids: string[]) {
  const { supabase } = await requirePermission("create_quiz");
  const { error } = await supabase.from("pool_questions").delete().in("id", ids);
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
  difficulty: Difficulty;
  questionText: string;
  explanation: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export async function updateQuestion(questionId: string, input: UpdateQuestionInput) {
  const { supabase } = await requirePermission("create_quiz");

  const validationError = validateQuestionInput(input);
  if (validationError) throw new Error(validationError);

  const byLetter = new Map(input.options.map((option) => [option.id, option]));
  const correctLetter = input.options.find((option) => option.isCorrect)?.id ?? "a";

  const { error } = await supabase
    .from("pool_questions")
    .update({
      difficulty: input.difficulty,
      question_text: input.questionText,
      explanation: input.explanation,
      option_a: byLetter.get("a")?.text ?? "",
      option_b: byLetter.get("b")?.text ?? "",
      option_c: byLetter.get("c")?.text ?? "",
      option_d: byLetter.get("d")?.text ?? "",
      correct_option: correctLetter,
    })
    .eq("id", questionId);
  if (error) throw new Error(error.message);
}

export interface CreateManualQuestionInput {
  difficulty: Difficulty;
  questionText: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
}

// Manual questions are approved automatically on creation — a human wrote
// them, so they skip the AI-generated review gate (CLAUDE.md rule #14).
export async function createManualQuestion(quizId: string, input: CreateManualQuestionInput) {
  const { supabase, orgId } = await requirePermission("create_quiz");

  const validationError = validateQuestionInput(input);
  if (validationError) throw new Error(validationError);

  let poolId = await resolvePoolId(supabase, quizId);
  if (!poolId) {
    // A manually-built quiz has no pool yet (no AI generation ever ran) —
    // create one on first manual question, same as the generation flow does
    // up front.
    const { data: pool, error: poolError } = await supabase
      .from("quiz_pools")
      .insert({
        organization_id: orgId,
        quiz_id: quizId,
        total_questions: 0,
        easy_count: 0,
        medium_count: 0,
        hard_count: 0,
      })
      .select("id")
      .single();
    if (poolError || !pool) throw new Error("Could not create a question pool for this quiz.");
    poolId = pool.id;
  }

  const correctIndex = input.options.findIndex((option) => option.isCorrect);
  const correctLetter = LETTERS[correctIndex] ?? "a";

  const { data: question, error: questionError } = await supabase
    .from("pool_questions")
    .insert({
      organization_id: orgId,
      pool_id: poolId,
      difficulty: input.difficulty,
      question_text: input.questionText,
      option_a: input.options[0]?.text ?? "",
      option_b: input.options[1]?.text ?? "",
      option_c: input.options[2]?.text ?? "",
      option_d: input.options[3]?.text ?? "",
      correct_option: correctLetter,
      explanation: input.explanation,
      is_approved: true,
      generated_by_ai: false,
    })
    .select("id")
    .single();

  if (questionError || !question) {
    throw new Error(questionError?.message ?? "Could not save the question.");
  }

  revalidatePath(`/dashboard/quizzes/${quizId}/questions`);
  return question;
}
