import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { AttemptSummary } from "@/lib/quiz-status";
import { QuizzesTabs, type AssignmentEntry } from "./QuizzesTabs";

export const metadata: Metadata = { title: "My Quizzes" };

export default async function MyQuizzesPage() {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("quiz_assignments")
    .select(
      "id, deadline, quizzes(id, title, timer_minutes, passing_percent, questions_to_show, difficulty_mode, max_attempts, courses(title))"
    );

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, quiz_id, status, percentage, submitted_at");

  const attemptsByQuiz = new Map<string, AttemptSummary[]>();
  for (const attempt of attempts ?? []) {
    const list = attemptsByQuiz.get(attempt.quiz_id) ?? [];
    list.push({
      id: attempt.id,
      status: attempt.status,
      percentage: attempt.percentage,
      submittedAt: attempt.submitted_at,
    });
    attemptsByQuiz.set(attempt.quiz_id, list);
  }

  const entries: AssignmentEntry[] = (assignments ?? [])
    .filter((assignment) => !!assignment.quizzes)
    .map((assignment) => ({
      assignmentId: assignment.id,
      deadline: assignment.deadline,
      quiz: {
        id: assignment.quizzes!.id,
        title: assignment.quizzes!.title,
        courseTitle: assignment.quizzes!.courses?.title ?? "—",
        timerMinutes: assignment.quizzes!.timer_minutes,
        passingPercent: assignment.quizzes!.passing_percent,
        questionsToShow: assignment.quizzes!.questions_to_show,
        difficultyMode: assignment.quizzes!.difficulty_mode,
        maxAttempts: assignment.quizzes!.max_attempts,
      },
      attempts: attemptsByQuiz.get(assignment.quizzes!.id) ?? [],
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">My Quizzes</h1>
        <p className="mt-1 text-sm text-fg-secondary">Everything assigned to you.</p>
      </div>

      <QuizzesTabs entries={entries} />
    </div>
  );
}
