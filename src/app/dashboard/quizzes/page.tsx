import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Quizzes" };
import { buttonVariants } from "@/components/ui";
import { QuizzesTable, type QuizRow } from "./QuizzesTable";

export default async function QuizzesPage() {
  const supabase = await createClient();

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(
      "id, title, course_id, time_limit_minutes, passing_score, questions_to_show, difficulty_mode, max_attempts, status, created_at, courses(name)"
    )
    .order("created_at", { ascending: false });

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name")
    .order("name", { ascending: true });

  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  const questionCounts = new Map<string, { approved: number; total: number }>();

  if (quizIds.length > 0) {
    const { data: pools } = await supabase.from("quiz_pools").select("id, quiz_id").in("quiz_id", quizIds);
    const poolIdToQuizId = new Map((pools ?? []).map((pool) => [pool.id, pool.quiz_id]));
    const poolIds = (pools ?? []).map((pool) => pool.id);

    if (poolIds.length > 0) {
      const { data: questions } = await supabase
        .from("pool_questions")
        .select("pool_id, is_approved")
        .in("pool_id", poolIds);

      for (const question of questions ?? []) {
        const quizId = poolIdToQuizId.get(question.pool_id);
        if (!quizId) continue;
        const current = questionCounts.get(quizId) ?? { approved: 0, total: 0 };
        current.total += 1;
        if (question.is_approved) current.approved += 1;
        questionCounts.set(quizId, current);
      }
    }
  }

  const rows: QuizRow[] = (quizzes ?? []).map((quiz) => {
    const counts = questionCounts.get(quiz.id) ?? { approved: 0, total: 0 };
    return {
      id: quiz.id,
      title: quiz.title,
      courseId: quiz.course_id,
      courseName: (quiz.courses as unknown as { name: string } | null)?.name ?? "—",
      timeLimitMinutes: quiz.time_limit_minutes,
      passingScore: quiz.passing_score,
      difficultyMode: quiz.difficulty_mode as QuizRow["difficultyMode"],
      status: quiz.status as QuizRow["status"],
      approvedQuestions: counts.approved,
      totalQuestions: counts.total,
    };
  });

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-fg">Quizzes</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Create quizzes and manage their settings and questions.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/quizzes/generate" className={buttonVariants({ variant: "secondary" })}>
            <Sparkles className="size-4" /> Generate with AI
          </Link>
          <Link href="/dashboard/quizzes/new" className={buttonVariants()}>
            <Plus className="size-4" /> Create quiz
          </Link>
        </div>
      </div>

      <QuizzesTable rows={rows} courses={courses ?? []} />
    </div>
  );
}
