import { redirect } from "next/navigation";
import Link from "next/link";
import { Award, CheckCircle2, ClipboardList, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, buttonVariants } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { AssignedQuizCard } from "@/components/user/AssignedQuizCard";
import { ProgressChart } from "@/components/user/ProgressChart";
import type { AssignmentQuiz, AttemptSummary } from "@/lib/quiz-status";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("quiz_assignments")
    .select(
      "id, deadline, quizzes(id, title, timer_minutes, passing_percent, questions_to_show, difficulty_mode, max_attempts, courses(title))"
    );

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, quiz_id, status, percentage, submitted_at, quizzes(title, passing_percent)");

  const { count: certificateCount } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true });

  const attemptsByQuiz = new Map<string, AttemptSummary[]>();
  for (const attempt of attempts ?? []) {
    const list = attemptsByQuiz.get(attempt.quiz_id) ?? [];
    list.push({ id: attempt.id, status: attempt.status, percentage: attempt.percentage, submittedAt: attempt.submitted_at });
    attemptsByQuiz.set(attempt.quiz_id, list);
  }

  const submittedAttempts = (attempts ?? []).filter(
    (attempt) => attempt.status === "submitted" && attempt.percentage !== null
  );

  const quizzesAssigned = assignments?.length ?? 0;
  const quizzesCompleted = submittedAttempts.length;
  const averageScore =
    submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce((sum, attempt) => sum + (attempt.percentage ?? 0), 0) /
            submittedAttempts.length
        )
      : null;

  const firstName = (currentUser.profile.full_name ?? currentUser.email).split(" ")[0];

  const statCards = [
    { label: "Quizzes Assigned", value: quizzesAssigned, icon: ClipboardList },
    { label: "Completed", value: quizzesCompleted, icon: CheckCircle2 },
    { label: "Average Score", value: averageScore !== null ? `${averageScore}%` : "—", icon: TrendingUp },
    { label: "Certificates Earned", value: certificateCount ?? 0, icon: Award },
  ];

  const progressData = [...submittedAttempts]
    .filter((attempt) => attempt.submitted_at)
    .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
    .map((attempt) => ({ date: attempt.submitted_at as string, percentage: attempt.percentage as number }));

  const avgPassingPercent =
    submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce((sum, attempt) => sum + (attempt.quizzes?.passing_percent ?? 70), 0) /
            submittedAttempts.length
        )
      : 70;

  const recentResults = [...submittedAttempts]
    .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-fg-secondary">{formatDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
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
        <h2 className="text-lg font-semibold text-fg">Quizzes To Take</h2>
        {!assignments || assignments.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-10" />}
            title="No quizzes assigned yet"
            description="Your admin will assign quizzes here once they're ready."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {assignments.map((assignment) => {
              if (!assignment.quizzes) return null;
              const quiz: AssignmentQuiz = {
                id: assignment.quizzes.id,
                title: assignment.quizzes.title,
                courseTitle: assignment.quizzes.courses?.title ?? "—",
                timerMinutes: assignment.quizzes.timer_minutes,
                passingPercent: assignment.quizzes.passing_percent,
                questionsToShow: assignment.quizzes.questions_to_show,
                difficultyMode: assignment.quizzes.difficulty_mode,
                maxAttempts: assignment.quizzes.max_attempts,
              };
              return (
                <AssignedQuizCard
                  key={assignment.id}
                  quiz={quiz}
                  deadline={assignment.deadline}
                  attempts={attemptsByQuiz.get(quiz.id) ?? []}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">My Progress</h2>
        <Card className="p-5">
          {progressData.length < 2 ? (
            <p className="text-sm text-fg-secondary">
              Complete more quizzes to see your progress.
            </p>
          ) : (
            <ProgressChart data={progressData} passingPercent={avgPassingPercent} />
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Recent Results</h2>
        {recentResults.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-10" />}
            title="No results yet"
            description="Your completed quizzes will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border">
              {recentResults.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-fg">{attempt.quizzes?.title ?? "Quiz"}</p>
                    <p className="text-xs text-fg-muted">{formatDate(attempt.submitted_at as string)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        (attempt.percentage ?? 0) >= (attempt.quizzes?.passing_percent ?? 70)
                          ? "success"
                          : "danger"
                      }
                    >
                      {attempt.percentage}%
                    </Badge>
                    <Link
                      href={`/quiz/result/${attempt.id}`}
                      className={buttonVariants({ size: "sm", variant: "secondary" })}
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
