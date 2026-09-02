import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants, type Difficulty } from "@/components/ui";
import { QuestionsReview, type Summary } from "./QuestionsReview";

export const metadata: Metadata = { title: "Review Questions" };

function computeSummary(
  rows: { difficulty: Difficulty; is_approved: boolean }[]
): Summary {
  const summary: Summary = {
    total: rows.length,
    approved: 0,
    pending: 0,
    byDifficulty: {
      easy: { total: 0, approved: 0 },
      medium: { total: 0, approved: 0 },
      hard: { total: 0, approved: 0 },
    },
  };

  for (const row of rows) {
    if (row.is_approved) summary.approved += 1;
    else summary.pending += 1;

    summary.byDifficulty[row.difficulty].total += 1;
    if (row.is_approved) summary.byDifficulty[row.difficulty].approved += 1;
  }

  return summary;
}

export default async function QuizQuestionsPage(
  props: PageProps<"/dashboard/quizzes/[id]/questions">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, course_id")
    .eq("id", id)
    .maybeSingle();

  if (!quiz) notFound();

  // pool_questions belongs to a quiz's pool, not to the quiz directly —
  // one quiz_pools row per quiz (Table 8, docs/SCHEMA.md).
  const { data: pool } = await supabase.from("quiz_pools").select("id").eq("quiz_id", id).maybeSingle();
  const { data: allQuestions } = pool
    ? await supabase.from("pool_questions").select("difficulty, is_approved").eq("pool_id", pool.id)
    : { data: [] };

  const summary = computeSummary((allQuestions ?? []) as { difficulty: Difficulty; is_approved: boolean }[]);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/courses/${quiz.course_id}`}
            className="text-sm font-medium text-secondary hover:underline"
          >
            &larr; Back to course
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-fg">{quiz.title}</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Review questions before they can appear in a live quiz.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/quizzes/${quiz.id}/settings`}
            className={buttonVariants({ size: "sm", variant: "secondary" })}
          >
            <Settings className="size-4" /> Settings
          </Link>
          <Link
            href={`/dashboard/quizzes/${quiz.id}/questions/new`}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-4" /> Add question
          </Link>
        </div>
      </div>

      <QuestionsReview quizId={quiz.id} initialSummary={summary} />
    </div>
  );
}
