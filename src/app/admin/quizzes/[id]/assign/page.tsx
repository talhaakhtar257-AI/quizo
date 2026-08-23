import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AssignForm, type AssignedRow, type AssignableUser } from "./AssignForm";

export const metadata: Metadata = { title: "Assign Quiz" };

export default async function AssignQuizPage(
  props: PageProps<"/admin/quizzes/[id]/assign">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, is_published, course_id, courses(title)")
    .eq("id", id)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "user")
    .eq("status", "active")
    .order("full_name", { ascending: true });

  const { data: assignments } = await supabase
    .from("quiz_assignments")
    .select("user_id, deadline, assigned_at, profiles!quiz_assignments_user_id_fkey(full_name, email)")
    .eq("quiz_id", id)
    .order("assigned_at", { ascending: false });

  const { data: attempts } = await supabase
    .from("attempts")
    .select("user_id, status, percentage")
    .eq("quiz_id", id);

  const attemptsByUser = new Map<string, { used: number; best: number | null }>();
  for (const attempt of attempts ?? []) {
    const current = attemptsByUser.get(attempt.user_id) ?? { used: 0, best: null };
    current.used += 1;
    if (attempt.status === "submitted" && attempt.percentage !== null) {
      current.best = current.best === null ? attempt.percentage : Math.max(current.best, attempt.percentage);
    }
    attemptsByUser.set(attempt.user_id, current);
  }

  const assignedUserIds = new Set((assignments ?? []).map((row) => row.user_id));

  const assignable: AssignableUser[] = (activeUsers ?? [])
    .filter((user) => !assignedUserIds.has(user.id))
    .map((user) => ({
      id: user.id,
      fullName: user.full_name ?? "—",
      email: user.email ?? "—",
    }));

  const assigned: AssignedRow[] = (assignments ?? []).map((row) => {
    const stats = attemptsByUser.get(row.user_id) ?? { used: 0, best: null };
    return {
      userId: row.user_id,
      fullName: row.profiles?.full_name ?? "—",
      email: row.profiles?.email ?? "—",
      deadline: row.deadline,
      assignedAt: row.assigned_at,
      attemptsUsed: stats.used,
      bestScore: stats.best,
    };
  });

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Link
          href="/admin/quizzes"
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; Back to quizzes
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-fg">Assign &quot;{quiz.title}&quot;</h1>
        <p className="mt-1 text-sm text-fg-secondary">{quiz.courses?.title ?? "—"}</p>
      </div>

      <AssignForm
        quizId={quiz.id}
        isPublished={quiz.is_published}
        assignableUsers={assignable}
        assignedUsers={assigned}
      />
    </div>
  );
}
