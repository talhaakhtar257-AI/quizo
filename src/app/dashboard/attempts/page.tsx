import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AttemptsTable, type AttemptRow } from "./AttemptsTable";
import { LoadFailed } from "@/components/ui";

export const metadata: Metadata = { title: "Attempts" };

export default async function AdminAttemptsPage() {
  const supabase = await createClient();

  const [{ data: attempts, error }, { data: quizzes }, { data: students }] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select(
        "id, quiz_id, student_id, attempt_number, started_at, submitted_at, status, total_correct, total_questions, score, profiles(full_name, email), quizzes(title, time_limit_minutes, passing_score)"
      )
      .order("started_at", { ascending: false }),
    supabase.from("quizzes").select("id, title").order("title", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "student")
      .order("full_name", { ascending: true }),
  ]);

  const rows: AttemptRow[] = (attempts ?? []).map((attempt) => ({
    id: attempt.id,
    studentId: attempt.student_id,
    studentName: attempt.profiles?.full_name ?? attempt.profiles?.email ?? "Unknown",
    studentEmail: attempt.profiles?.email ?? "—",
    quizId: attempt.quiz_id,
    quizTitle: attempt.quizzes?.title ?? "Deleted quiz",
    timeLimitMinutes: attempt.quizzes?.time_limit_minutes ?? null,
    passingScore: attempt.quizzes?.passing_score ?? 70,
    attemptNumber: attempt.attempt_number,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    status: attempt.status as AttemptRow["status"],
    totalCorrect: attempt.total_correct,
    totalQuestions: attempt.total_questions,
    score: attempt.score,
  }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Attempts</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Every quiz attempt across all students.
        </p>
      </div>

      {error ? (
        <LoadFailed what="quiz attempts" />
      ) : (
        <AttemptsTable
          rows={rows}
          quizzes={quizzes ?? []}
          students={(students ?? []).map((student) => ({
            id: student.id,
            name: student.full_name ?? student.email ?? "Unknown",
          }))}
          initialNow={new Date().toISOString()}
        />
      )}
    </div>
  );
}
