import { redirect } from "next/navigation";
import Link from "next/link";
import { Award, CheckCircle2, ClipboardList, Clock, Download, TrendingUp, XCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, buttonVariants } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { QuizCard } from "@/components/user/QuizCard";
import { ProgressChart } from "@/components/user/ProgressChart";
import type { AttemptSummary, StudentQuiz } from "@/lib/quiz-status";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const supabase = await createClient();

  // RLS already limits this to published quizzes in courses the student is
  // an approved enrollment in.
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select(
      "id, title, time_limit_minutes, passing_score, questions_to_show, difficulty_mode, max_attempts, courses(name)"
    )
    .eq("status", "published");

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, status, score, submitted_at, quizzes(title, passing_score)");

  // docs/FEATURES.md promises a "waiting for approval" state for a student
  // whose enrollment is still pending. It was never built, so a pending
  // student saw an ordinary dashboard with empty lists and no idea their
  // request was sitting unapproved — indistinguishable from an approved
  // student in a course that simply has no quizzes yet.
  const { data: myEnrollments } = await supabase
    .from("enrollments")
    .select("status, courses(name)")
    .eq("student_id", currentUser.id);

  const pendingCourses = (myEnrollments ?? [])
    .filter((row) => row.status === "pending")
    .map((row) => (row.courses as unknown as { name: string } | null)?.name)
    .filter((name): name is string => Boolean(name));

  const rejectedCourses = (myEnrollments ?? [])
    .filter((row) => row.status === "rejected")
    .map((row) => (row.courses as unknown as { name: string } | null)?.name)
    .filter((name): name is string => Boolean(name));

  const { count: certificateCount } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true });

  const { data: certificates } = await supabase
    .from("certificates")
    .select("certificate_number, issued_at, quizzes(title, courses(name))")
    .order("issued_at", { ascending: false });

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

  const submittedAttempts = (attempts ?? []).filter(
    (attempt) => attempt.status === "submitted" && attempt.score !== null
  );

  const quizzesAvailable = quizzes?.length ?? 0;
  const quizzesCompleted = submittedAttempts.length;
  const averageScore =
    submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) /
            submittedAttempts.length
        )
      : null;

  const firstName = (currentUser.profile.full_name ?? currentUser.email).split(" ")[0];

  const statCards = [
    { label: "Quizzes Available", value: quizzesAvailable, icon: ClipboardList },
    { label: "Completed", value: quizzesCompleted, icon: CheckCircle2 },
    { label: "Average Score", value: averageScore !== null ? `${averageScore}%` : "—", icon: TrendingUp },
    { label: "Certificates Earned", value: certificateCount ?? 0, icon: Award },
  ];

  const progressData = [...submittedAttempts]
    .filter((attempt) => attempt.submitted_at)
    .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
    .map((attempt) => ({ date: attempt.submitted_at as string, percentage: attempt.score as number }));

  const avgPassingScore =
    submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce((sum, attempt) => sum + (attempt.quizzes?.passing_score ?? 70), 0) /
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

      {pendingCourses.length > 0 && (
        <Card className="border-warning/40 bg-warning-bg p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-fg">Waiting for approval</p>
              <p className="mt-1 text-sm text-fg-secondary">
                Your request to join{" "}
                <span className="font-medium text-fg">{pendingCourses.join(", ")}</span>{" "}
                {pendingCourses.length === 1 ? "is" : "are"} waiting for your instructor to approve
                it. Quizzes will appear here as soon as they do — you don&apos;t need to do anything
                else.
              </p>
            </div>
          </div>
        </Card>
      )}

      {rejectedCourses.length > 0 && (
        <Card className="border-danger/40 bg-danger-bg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-fg">Request not approved</p>
              <p className="mt-1 text-sm text-fg-secondary">
                Your request to join{" "}
                <span className="font-medium text-fg">{rejectedCourses.join(", ")}</span> was not
                approved. Contact your instructor if you think this is a mistake.
              </p>
            </div>
          </div>
        </Card>
      )}

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
        {!quizzes || quizzes.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-10" />}
            title="No quizzes available yet"
            description="Once your admin publishes a quiz in a course you're approved for, it will show up here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {quizzes.map((quiz) => {
              const studentQuiz: StudentQuiz = {
                id: quiz.id,
                title: quiz.title,
                courseName: quiz.courses?.name ?? "—",
                timeLimitMinutes: quiz.time_limit_minutes,
                passingScore: quiz.passing_score,
                questionsToShow: quiz.questions_to_show,
                difficultyMode: quiz.difficulty_mode as StudentQuiz["difficultyMode"],
                maxAttempts: quiz.max_attempts,
              };
              return (
                <QuizCard key={quiz.id} quiz={studentQuiz} attempts={attemptsByQuiz.get(quiz.id) ?? []} />
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
            <ProgressChart data={progressData} passingPercent={avgPassingScore} />
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
                        (attempt.score ?? 0) >= (attempt.quizzes?.passing_score ?? 70) ? "success" : "danger"
                      }
                    >
                      {attempt.score}%
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">Certificates</h2>
        {!certificates || certificates.length === 0 ? (
          <EmptyState
            icon={<Award className="size-10" />}
            title="No certificates yet"
            description="Pass a quiz to earn your first certificate."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border">
              {certificates.map((certificate) => (
                <li
                  key={certificate.certificate_number}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">{certificate.quizzes?.title ?? "Quiz"}</p>
                    <p className="text-xs text-fg-muted">
                      {certificate.quizzes?.courses?.name ?? "—"} · Issued{" "}
                      {certificate.issued_at ? formatDate(certificate.issued_at) : "—"}
                    </p>
                  </div>
                  <Link
                    href={`/certificates/${certificate.certificate_number}`}
                    className={buttonVariants({ size: "sm", variant: "secondary" })}
                  >
                    <Download className="size-4" />
                    Download
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
