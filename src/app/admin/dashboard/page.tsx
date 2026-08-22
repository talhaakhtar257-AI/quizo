import Link from "next/link";
import { BookOpen, ClipboardList, Clock, ListChecks, Target, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import type { Difficulty } from "@/lib/quiz-engine";
import { DashboardFilters } from "./DashboardFilters";
import { AttemptsPerDayChart } from "./AttemptsPerDayChart";
import { PassFailDonut } from "./PassFailDonut";
import { AvgScorePerQuizChart } from "./AvgScorePerQuizChart";
import { WeakQuestionsTable } from "./WeakQuestionsTable";
import { PerformersLists } from "./PerformersLists";
import { DifficultyBreakdownChart } from "./DifficultyBreakdownChart";

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; course?: string; quiz?: string }>;
}) {
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
    { count: totalUsers },
    { count: pendingApprovals },
    { count: totalCourses },
    { count: totalQuizzes },
    { count: totalAttempts },
    { count: submittedCount },
    { count: passedCount },
    { data: courses },
    { data: quizzesList },
    { data: attemptsPerDay },
    { data: passFail },
    { data: avgScorePerQuiz },
    { data: weakQuestions },
    { data: studentPerformance },
    { data: difficultyBreakdown },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "user")
      .eq("status", "pending"),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("quizzes").select("id", { count: "exact", head: true }),
    supabase.from("attempts").select("id", { count: "exact", head: true }),
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted")
      .eq("passed", true),
    supabase.from("courses").select("id, title").order("title", { ascending: true }),
    supabase.from("quizzes").select("id, title, course_id").order("title", { ascending: true }),
    supabase.rpc("dashboard_attempts_per_day", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_pass_fail", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_avg_score_per_quiz", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_weak_questions", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_student_performance", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
    supabase.rpc("dashboard_difficulty_breakdown", { p_from: from, p_to: to, p_course_id: pCourse, p_quiz_id: pQuiz }),
  ]);

  const overallPassRate =
    submittedCount && submittedCount > 0 ? Math.round(((passedCount ?? 0) / submittedCount) * 100) : null;

  const statCards: { label: string; value: string | number; icon: typeof Users; href?: string }[] = [
    { label: "Total Users", value: totalUsers ?? 0, icon: Users },
    { label: "Pending Approvals", value: pendingApprovals ?? 0, icon: Clock, href: "/admin/users" },
    { label: "Total Courses", value: totalCourses ?? 0, icon: BookOpen },
    { label: "Total Quizzes", value: totalQuizzes ?? 0, icon: ListChecks },
    { label: "Total Attempts", value: totalAttempts ?? 0, icon: ClipboardList },
    { label: "Overall Pass Rate", value: overallPassRate !== null ? `${overallPassRate}%` : "—", icon: Target },
  ];

  const pf = passFail?.[0] ?? { passed_count: 0, failed_count: 0 };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Dashboard</h1>
        <p className="mt-1 text-sm text-fg-secondary">Platform-wide activity and quiz performance.</p>
      </div>

      <DashboardFilters
        courses={(courses ?? []).map((c) => ({ id: c.id, title: c.title }))}
        quizzes={(quizzesList ?? []).map((q) => ({ id: q.id, title: q.title, courseId: q.course_id }))}
        from={from}
        to={to}
        course={course}
        quiz={quiz}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon, href }) => {
          const card = (
            <Card
              className={"space-y-2 p-4" + (href ? " transition-colors hover:bg-surface-raised" : "")}
            >
              <div className="flex items-center gap-2 text-fg-secondary">
                <Icon className="size-4" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-fg">{value}</p>
            </Card>
          );
          return href ? (
            <Link key={label} href={href}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </div>

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
            quizTitle: r.quiz_title,
            difficulty: r.difficulty as Difficulty,
            timesShown: r.times_shown,
            timesWrong: r.times_wrong,
            wrongPercent: r.wrong_percent,
          }))}
        />
      </Card>

      <Card className="p-5">
        <PerformersLists
          students={(studentPerformance ?? []).map((r) => ({
            userId: r.user_id,
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
