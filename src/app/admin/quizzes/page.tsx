import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui";
import { QuizzesTable, type QuizRow } from "./QuizzesTable";

export default async function AdminQuizzesPage() {
  const supabase = await createClient();

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(
      "id, title, course_id, timer_minutes, passing_percent, questions_to_show, difficulty_mode, max_attempts, is_published, created_at, courses(title)"
    )
    .order("created_at", { ascending: false });

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title", { ascending: true });

  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  const questionCounts = new Map<string, { approved: number; total: number }>();

  if (quizIds.length > 0) {
    const { data: questions } = await supabase
      .from("questions")
      .select("quiz_id, is_approved")
      .in("quiz_id", quizIds);

    for (const question of questions ?? []) {
      const current = questionCounts.get(question.quiz_id) ?? { approved: 0, total: 0 };
      current.total += 1;
      if (question.is_approved) current.approved += 1;
      questionCounts.set(question.quiz_id, current);
    }
  }

  const rows: QuizRow[] = (quizzes ?? []).map((quiz) => {
    const counts = questionCounts.get(quiz.id) ?? { approved: 0, total: 0 };
    return {
      id: quiz.id,
      title: quiz.title,
      courseId: quiz.course_id,
      courseTitle: quiz.courses?.title ?? "—",
      timerMinutes: quiz.timer_minutes,
      passingPercent: quiz.passing_percent,
      difficultyMode: quiz.difficulty_mode,
      isPublished: quiz.is_published,
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
          <Link href="/admin/quizzes/generate" className={buttonVariants({ variant: "secondary" })}>
            <Sparkles className="size-4" /> Generate with AI
          </Link>
          <Link href="/admin/quizzes/new" className={buttonVariants()}>
            <Plus className="size-4" /> Create quiz
          </Link>
        </div>
      </div>

      <QuizzesTable rows={rows} courses={courses ?? []} />
    </div>
  );
}
