import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPermissionFlags } from "@/lib/permissions";
import { Download } from "lucide-react";
import { Card, buttonVariants } from "@/components/ui";
import type { Difficulty } from "@/lib/quiz-engine";
import { DashboardFilters } from "./charts/DashboardFilters";
import { AttemptsPerDayChart } from "./charts/AttemptsPerDayChart";
import { PassFailDonut } from "./charts/PassFailDonut";
import { AvgScorePerQuizChart } from "./charts/AvgScorePerQuizChart";
import { WeakQuestionsTable } from "./charts/WeakQuestionsTable";
import { PerformersLists } from "./charts/PerformersLists";
import { DifficultyBreakdownChart } from "./charts/DifficultyBreakdownChart";

export const metadata: Metadata = { title: "Reports" };

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; course?: string; quiz?: string }>;
}) {
  const flags = await getPermissionFlags();
  if (!flags.view_analytics) redirect("/dashboard");

  const params = await searchParams;
  const today = new Date();
  const defaultFrom = toISODate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));
  const defaultTo = toISODate(today);

  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;
  const course = params.course || "all";
  const quiz = params.quiz || "all";

  const pCourse = course === "all" ? undefined : course;
  const pQuiz = quiz === "all" ? undefined : quiz;

  const supabase = await createClient();

  const [
    { data: courses },
    { data: quizzesList },
    { data: attemptsPerDay },
    { data: passFail },
    { data: avgScorePerQuiz },
    { data: weakQuestions },
    { data: studentPerformance },
    { data: difficultyBreakdown },
  ] = await Promise.all([
    supabase.from("courses").select("id, name").order("name", { ascending: true }),
    supabase.from("quizzes").select("id, title, course_id").order("title", { ascending: true }),
    supabase.rpc("dashboard_attempts_per_day", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_pass_fail", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_avg_score_per_quiz", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_weak_questions", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_student_performance", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_difficulty_breakdown", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
  ]);

  const selectedQuizTitle = pQuiz ? (quizzesList ?? []).find((q) => q.id === pQuiz)?.title ?? null : null;
  const pf = passFail?.[0] ?? { passed_count: 0, failed_count: 0 };

  const { data: orgRow } = await supabase.from("organizations").select("plan").maybeSingle();
  const { data: planRow } = await supabase
    .from("plan_limits")
    .select("has_csv_export")
    .eq("plan", orgRow?.plan ?? "free")
    .single();
  const csvEnabled = Boolean(planRow?.has_csv_export);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-fg">Reports</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Score trends, weak questions, and student performance for the selected range.
          </p>
        </div>
        {csvEnabled ? (
          <a
            href={`/dashboard/reports/export?from=${from}&to=${to}&course=${course}&quiz=${quiz}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </a>
        ) : (
          <span
            className="text-xs text-fg-muted"
            title="CSV export is included on Pro and Institution"
          >
            CSV export is a Pro feature
          </span>
        )}
      </div>

      <DashboardFilters
        courses={(courses ?? []).map((c) => ({ id: c.id, title: c.name }))}
        quizzes={(quizzesList ?? []).map((q) => ({ id: q.id, title: q.title, courseId: q.course_id }))}
        from={from}
        to={to}
        course={course}
        quiz={quiz}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold text-fg">Attempts Per Day</h2>
          <AttemptsPerDayChart
            data={(attemptsPerDay ?? []).map((r) => ({ day: r.day, count: r.attempt_count }))}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-semibold text-fg">Pass vs Fail</h2>
          <PassFailDonut passedCount={pf.passed_count ?? 0} failedCount={pf.failed_count ?? 0} />
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold text-fg">Average Score Per Quiz</h2>
        <AvgScorePerQuizChart
          data={(avgScorePerQuiz ?? []).map((r) => ({
            quizId: r.quiz_id,
            quizTitle: r.quiz_title,
            avgPercentage: r.avg_percentage ?? 0,
            passingPercent: r.passing_percent,
            attemptCount: r.attempt_count,
          }))}
        />
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold text-fg">Weak Questions</h2>
        <WeakQuestionsTable
          rows={(weakQuestions ?? []).map((r) => ({
            questionId: r.question_id,
            questionText: r.question_text,
            quizId: r.quiz_id,
            quizTitle: r.quiz_title,
            difficulty: r.difficulty as Difficulty,
            timesShown: r.times_shown,
            timesWrong: r.times_wrong,
            wrongPercent: r.wrong_percent,
          }))}
          filteredQuizTitle={selectedQuizTitle}
        />
      </Card>

      <Card className="p-5">
        <PerformersLists
          students={(studentPerformance ?? []).map((r) => ({
            userId: r.student_id,
            fullName: r.full_name ?? r.email ?? "Unknown",
            email: r.email ?? "—",
            avgPercentage: r.avg_percentage ?? 0,
            attemptCount: r.attempt_count,
            latestPassed: r.latest_passed,
          }))}
        />
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-lg font-semibold text-fg">Difficulty Separation</h2>
        <p className="mb-3 text-sm text-fg-secondary">
          Correct vs wrong answers at each level. If Hard is answered correctly as often as Easy, the AI
          isn&apos;t producing three genuinely distinct difficulty levels.
        </p>
        <DifficultyBreakdownChart
          data={(difficultyBreakdown ?? []).map((r) => ({
            difficulty: r.difficulty as Difficulty,
            correct: r.correct_count,
            wrong: r.wrong_count,
          }))}
        />
      </Card>
    </div>
  );
}
