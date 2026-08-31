import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Users, ListChecks, Target, Plus, UserCheck, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, EmptyState } from "@/components/ui";

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
