import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { AttemptSummary } from "@/lib/quiz-status";
import { QuizzesTabs, type QuizEntry } from "./QuizzesTabs";
import { LoadFailed } from "@/components/ui";

export const metadata: Metadata = { title: "My Quizzes" };

export default async function MyQuizzesPage() {
  const supabase = await createClient();

  // RLS already limits this to published quizzes in courses the student is
  // an approved enrollment in — no separate "assignment" step exists.
  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select(
      "id, title, time_limit_minutes, passing_score, questions_to_show, difficulty_mode, max_attempts, courses(name)"
    )
    .eq("status", "published");

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, status, score, submitted_at");

  const attemptsByQuiz = new Map<string, AttemptSummary[]>();
  for (const attempt of attempts ?? []) {
    const list = attemptsByQuiz.get(attempt.quiz_id) ?? [];
    list.push({
      id: attempt.id,
      status: attempt.status as AttemptSummary["status"],
      score: attempt.score,
      submittedAt: attempt.submitted_at,
    });
    attemptsByQuiz.set(attempt.quiz_id, list);
  }

  const entries: QuizEntry[] = (quizzes ?? []).map((quiz) => ({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      courseName: quiz.courses?.name ?? "—",
      timeLimitMinutes: quiz.time_limit_minutes,
      passingScore: quiz.passing_score,
      questionsToShow: quiz.questions_to_show,
      difficultyMode: quiz.difficulty_mode as QuizEntry["quiz"]["difficultyMode"],
      maxAttempts: quiz.max_attempts,
    },
    attempts: attemptsByQuiz.get(quiz.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">My Quizzes</h1>
        <p className="mt-1 text-sm text-fg-secondary">Every quiz available to you.</p>
      </div>

      {error ? <LoadFailed what="your quizzes" /> : <QuizzesTabs entries={entries} />}
    </div>
  );
}
