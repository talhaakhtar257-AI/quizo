import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  Users,
  ListChecks,
  Target,
  Plus,
  UserCheck,
  Activity,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, EmptyState, buttonVariants } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

// The rich multi-chart analytics dashboard (attempts-per-day, pass/fail,
// weak questions, difficulty separation) is Phase L's job — it depends on
// org-scoped SQL functions that don't exist yet (the v1 versions were
// dropped in Phase A along with the rest of the old schema). This is the
// simpler home page docs/BUILD-PLAN.md's Phase E actually calls for: stat
// cards, recent activity, quick actions.
export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: courseCount },
    { count: studentCount },
    { count: quizzesThisMonthCount },
    { data: recentEnrollments },
    { data: recentQuizzes },
  ] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase
      .from("quizzes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setDate(1)).toISOString()),
    supabase
      .from("enrollments")
      .select("id, status, created_at, profiles!enrollments_student_id_fkey(full_name), courses(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("quizzes")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // A brand-new academy can't generate questions until it has its own Gemini
  // key AND some uploaded material — but nothing on screen said so, so the
  // Generate button just refused to work with no explanation of what was
  // missing. This checklist makes the remaining setup explicit.
  const [{ data: settingsRow }, { count: contentCount }] = await Promise.all([
    supabase.from("organization_settings").select("gemini_api_key").maybeSingle(),
    supabase.from("content_uploads").select("id", { count: "exact", head: true }),
  ]);

  const setupSteps = [
    {
      label: "Add your free Gemini API key",
      done: Boolean(settingsRow?.gemini_api_key),
      href: "/dashboard/settings",
      cta: "Add key",
      why: "Quizo uses your own free Google Gemini key to write questions.",
    },
    {
      label: "Create your first course",
      done: (courseCount ?? 0) > 0,
      href: "/dashboard/courses/new",
      cta: "Create course",
      why: "Students join a course with its invite code.",
    },
    {
      label: "Upload study material",
      done: (contentCount ?? 0) > 0,
      href: "/dashboard/courses",
      cta: "Upload",
      why: "The AI writes questions from material you provide.",
    },
    {
      label: "Generate your first quiz",
      done: (quizzesThisMonthCount ?? 0) > 0,
      href: "/dashboard/quizzes/generate",
      cta: "Generate",
      why: "Review and approve the questions, then publish.",
    },
  ];
  const setupComplete = setupSteps.every((step) => step.done);

  // No attempts exist yet (Phase J) — average score has nothing to average.
  const averageScore: number | null = null;

  const statCards = [
    { label: "Total Courses", value: courseCount ?? 0, icon: BookOpen },
    { label: "Total Students", value: studentCount ?? 0, icon: Users },
    { label: "Quizzes This Month", value: quizzesThisMonthCount ?? 0, icon: ListChecks },
    { label: "Average Score", value: averageScore !== null ? `${averageScore}%` : "—", icon: Target },
  ];

  const activity = [
    ...(recentEnrollments ?? []).map((e) => ({
      id: `enroll-${e.id}`,
      text: `${(e.profiles as unknown as { full_name: string } | null)?.full_name ?? "A student"} ${
        e.status === "pending" ? "requested to join" : `was ${e.status} for`
      } ${(e.courses as unknown as { name: string } | null)?.name ?? "a course"}`,
      at: e.created_at,
    })),
    ...(recentQuizzes ?? []).map((q) => ({
      id: `quiz-${q.id}`,
      text: `Quiz "${q.title}" was ${q.status === "draft" ? "created" : q.status}`,
      at: q.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Dashboard</h1>
        <p className="mt-1 text-sm text-fg-secondary">Your academy at a glance.</p>
      </div>

      {!setupComplete && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-fg">Finish setting up</h2>
          <p className="mt-1 text-sm text-fg-secondary">
            A few steps left before your students can take their first quiz.
          </p>
          <ol className="mt-4 space-y-3">
            {setupSteps.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden="true" />
                )}
                <div className="flex-1">
                  <p
                    className={
                      step.done ? "text-sm text-fg-muted line-through" : "text-sm font-medium text-fg"
                    }
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-xs text-fg-secondary">{step.why}</p>
                  )}
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    {step.cta}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="space-y-2 p-5">
            <div className="flex items-center gap-2 text-fg-secondary">
              <Icon className="size-4" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-fg">{value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/courses/new">
          <Button size="sm">
            <Plus className="size-4" />
            Create Course
          </Button>
        </Link>
        <Link href="/dashboard/users">
          <Button size="sm" variant="secondary">
            <UserCheck className="size-4" />
            View Students
          </Button>
        </Link>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold text-fg">Recent Activity</h2>
        {activity.length === 0 ? (
          <EmptyState
            icon={<Activity className="size-8" />}
            title="Nothing yet"
            description="Course activity, enrollment requests, and new quizzes will show up here."
          />
        ) : (
          <ul className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="text-sm text-fg-secondary">
                <span className="text-fg">{item.text}</span>
                {item.at && (
                  <span className="ml-2 text-xs text-fg-muted">
                    {new Date(item.at).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
