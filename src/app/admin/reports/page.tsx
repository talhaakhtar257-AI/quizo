import { createClient } from "@/lib/supabase/server";
import { ReportsTable, type ReportRow, type AnswerRow } from "./ReportsTable";

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const [{ data: attempts }, { data: courses }, { data: quizzes }, { data: students }, { data: answers }] =
    await Promise.all([
      supabase
        .from("attempts")
        .select(
          "id, quiz_id, user_id, attempt_number, started_at, submitted_at, status, score, total_questions, percentage, passed, profiles(full_name, email), quizzes(title, timer_minutes, passing_percent, course_id)"
        )
        .order("started_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title", { ascending: true }),
      supabase.from("quizzes").select("id, title, course_id").order("title", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "user")
        .order("full_name", { ascending: true }),
      supabase
        .from("attempt_answers")
        .select("attempt_id, is_correct, questions(id, question_text, difficulty, quiz_id)"),
    ]);

  const rows: ReportRow[] = (attempts ?? []).map((attempt) => ({
    id: attempt.id,
    studentId: attempt.user_id,
    studentName: attempt.profiles?.full_name ?? attempt.profiles?.email ?? "Unknown",
    studentEmail: attempt.profiles?.email ?? "—",
    quizId: attempt.quiz_id,
    quizTitle: attempt.quizzes?.title ?? "Deleted quiz",
    courseId: attempt.quizzes?.course_id ?? "",
    timerMinutes: attempt.quizzes?.timer_minutes ?? 30,
    passingPercent: attempt.quizzes?.passing_percent ?? 70,
    attemptNumber: attempt.attempt_number,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    status: attempt.status,
    score: attempt.score,
    totalQuestions: attempt.total_questions,
    percentage: attempt.percentage,
    passed: attempt.passed,
  }));

  const answerRows: AnswerRow[] = (answers ?? [])
    .filter((answer) => answer.questions !== null)
    .map((answer) => ({
      attemptId: answer.attempt_id,
      isCorrect: answer.is_correct,
      questionId: answer.questions!.id,
      questionText: answer.questions!.question_text,
      difficulty: answer.questions!.difficulty,
      quizId: answer.questions!.quiz_id,
    }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Reports</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Filter quiz results and export them to Excel, CSV, or PDF.
        </p>
      </div>

      <ReportsTable
        rows={rows}
        answers={answerRows}
        courses={courses ?? []}
        quizzes={(quizzes ?? []).map((quiz) => ({ id: quiz.id, title: quiz.title, courseId: quiz.course_id }))}
        students={(students ?? []).map((student) => ({
          id: student.id,
          name: student.full_name ?? student.email ?? "Unknown",
        }))}
        initialNow={new Date().toISOString()}
      />
    </div>
  );
}
