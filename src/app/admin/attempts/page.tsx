import { createClient } from "@/lib/supabase/server";
import { AttemptsTable, type AttemptRow } from "./AttemptsTable";

export default async function AdminAttemptsPage() {
  const supabase = await createClient();

  const [{ data: attempts }, { data: quizzes }, { data: students }] = await Promise.all([
    supabase
      .from("attempts")
      .select(
        "id, quiz_id, user_id, attempt_number, started_at, submitted_at, status, score, total_questions, percentage, passed, profiles(full_name, email), quizzes(title, timer_minutes)"
      )
      .order("started_at", { ascending: false }),
    supabase.from("quizzes").select("id, title").order("title", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "user")
      .order("full_name", { ascending: true }),
  ]);

  const rows: AttemptRow[] = (attempts ?? []).map((attempt) => ({
    id: attempt.id,
    studentId: attempt.user_id,
    studentName: attempt.profiles?.full_name ?? attempt.profiles?.email ?? "Unknown",
    studentEmail: attempt.profiles?.email ?? "—",
    quizId: attempt.quiz_id,
    quizTitle: attempt.quizzes?.title ?? "Deleted quiz",
    timerMinutes: attempt.quizzes?.timer_minutes ?? 30,
    attemptNumber: attempt.attempt_number,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    status: attempt.status,
    score: attempt.score,
    totalQuestions: attempt.total_questions,
    percentage: attempt.percentage,
    passed: attempt.passed,
  }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Attempts</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Every quiz attempt across all students.
        </p>
      </div>

      <AttemptsTable
        rows={rows}
        quizzes={quizzes ?? []}
        students={(students ?? []).map((student) => ({
          id: student.id,
          name: student.full_name ?? student.email ?? "Unknown",
        }))}
        initialNow={new Date().toISOString()}
      />
    </div>
  );
}
