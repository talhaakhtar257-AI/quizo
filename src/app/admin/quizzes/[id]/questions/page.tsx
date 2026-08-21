import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Difficulty } from "@/components/ui";
import { QuestionsReview, type Summary } from "./QuestionsReview";

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
  props: PageProps<"/admin/quizzes/[id]/questions">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, course_id")
    .eq("id", id)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: allQuestions } = await supabase
    .from("questions")
    .select("difficulty, is_approved")
    .eq("quiz_id", id);

  const summary = computeSummary(allQuestions ?? []);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Link
          href={`/admin/courses/${quiz.course_id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; Back to course
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-fg">{quiz.title}</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Review AI-generated questions before they can appear in a live quiz.
        </p>
      </div>

      <QuestionsReview quizId={quiz.id} initialSummary={summary} />
    </div>
  );
}
