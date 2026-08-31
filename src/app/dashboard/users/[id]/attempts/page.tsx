import Link from "next/link";
import { ArrowLeft, Award, ClipboardList, Target, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Student Attempts" };
import { IneligibleNotice } from "@/components/user/IneligibleNotice";
import { Card } from "@/components/ui";
import { ProgressChart } from "@/components/user/ProgressChart";
import { AttemptsTable, type AttemptRow } from "@/app/dashboard/attempts/AttemptsTable";

export default async function AdminStudentAttemptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return <IneligibleNotice reason="This student could not be found." />;
  }

  const studentName = student.full_name ?? student.email ?? "Unknown student";
  const studentEmail = student.email ?? "—";

  const [{ data: attempts }, { data: quizzes }] = await Promise.all([
    supabase
      .from("quiz_attempts")
      .select(
        "id, quiz_id, student_id, attempt_number, started_at, submitted_at, status, total_correct, total_questions, score, quizzes(title, time_limit_minutes, passing_score)"
      )
      .eq("student_id", studentId)
      .order("started_at", { ascending: false }),
    supabase.from("quizzes").select("id, title").order("title", { ascending: true }),
  ]);

  const rows: AttemptRow[] = (attempts ?? []).map((attempt) => ({
    id: attempt.id,
    studentId: attempt.student_id,
    studentName,
    studentEmail,
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

  const submitted = (attempts ?? []).filter(
    (attempt) => attempt.status === "submitted" && attempt.score !== null
  );

  const totalAttempts = rows.length;
  const averageScore =
    submitted.length > 0
      ? Math.round(submitted.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / submitted.length)
      : null;
  const bestScore =
    submitted.length > 0 ? Math.max(...submitted.map((attempt) => attempt.score ?? 0)) : null;
  const passRate =
    submitted.length > 0
      ? Math.round(
          (submitted.filter((attempt) => (attempt.score ?? 0) >= (attempt.quizzes?.passing_score ?? 70))
            .length /
            submitted.length) *
            100
        )
      : null;

  const progressData = [...submitted]
    .filter((attempt) => attempt.submitted_at)
    .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
    .map((attempt) => ({ date: attempt.submitted_at as string, percentage: attempt.score as number }));

  const avgPassingScore =
    submitted.length > 0
      ? Math.round(
          submitted.reduce((sum, attempt) => sum + (attempt.quizzes?.passing_score ?? 70), 0) /
            submitted.length
        )
      : 70;

  const summaryCards = [
    { label: "Total Attempts", value: totalAttempts, icon: ClipboardList },
    { label: "Average Score", value: averageScore !== null ? `${averageScore}%` : "—", icon: TrendingUp },
    { label: "Best Score", value: bestScore !== null ? `${bestScore}%` : "—", icon: Award },
    { label: "Pass Rate", value: passRate !== null ? `${passRate}%` : "—", icon: Target },
  ];

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/dashboard/attempts"
        className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back to attempts
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">{studentName}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{studentEmail}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-fg-secondary">
              <Icon className="size-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-fg">{value}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Progress Over Time</h2>
        <Card className="p-5">
          {progressData.length < 2 ? (
            <p className="text-sm text-fg-secondary">
              This student needs at least two completed quizzes to show a trend.
            </p>
          ) : (
            <ProgressChart data={progressData} passingPercent={avgPassingScore} />
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Attempts</h2>
        <AttemptsTable
          rows={rows}
          quizzes={quizzes ?? []}
          initialNow={new Date().toISOString()}
          hideStudentColumn
          emptyDescription="This student hasn't attempted any quizzes yet."
        />
      </section>
    </div>
  );
}
