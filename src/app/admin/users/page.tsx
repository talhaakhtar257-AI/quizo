import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { UsersTable, type ActiveUserRow, type PendingUserRow, type RejectedUserRow } from "./UsersTable";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, status, created_at, rejection_reason")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  const all = profiles ?? [];
  const activeIds = all.filter((profile) => profile.status === "active").map((profile) => profile.id);

  const assignmentCounts = new Map<string, number>();
  const attemptStats = new Map<string, { completed: number; totalPercent: number }>();

  if (activeIds.length > 0) {
    const { data: assignments } = await supabase
      .from("quiz_assignments")
      .select("user_id")
      .in("user_id", activeIds);

    for (const row of assignments ?? []) {
      assignmentCounts.set(row.user_id, (assignmentCounts.get(row.user_id) ?? 0) + 1);
    }

    const { data: attempts } = await supabase
      .from("attempts")
      .select("user_id, status, percentage")
      .in("user_id", activeIds)
      .eq("status", "submitted");

    for (const row of attempts ?? []) {
      const current = attemptStats.get(row.user_id) ?? { completed: 0, totalPercent: 0 };
      current.completed += 1;
      current.totalPercent += row.percentage ?? 0;
      attemptStats.set(row.user_id, current);
    }
  }

  const pending: PendingUserRow[] = all
    .filter((profile) => profile.status === "pending")
    .map((profile) => ({
      id: profile.id,
      fullName: profile.full_name ?? "—",
      email: profile.email ?? "—",
      createdAt: profile.created_at,
    }));

  const active: ActiveUserRow[] = all
    .filter((profile) => profile.status === "active")
    .map((profile) => {
      const stats = attemptStats.get(profile.id);
      return {
        id: profile.id,
        fullName: profile.full_name ?? "—",
        email: profile.email ?? "—",
        quizzesAssigned: assignmentCounts.get(profile.id) ?? 0,
        quizzesCompleted: stats?.completed ?? 0,
        averageScore: stats && stats.completed > 0 ? Math.round(stats.totalPercent / stats.completed) : null,
      };
    });

  const rejected: RejectedUserRow[] = all
    .filter((profile) => profile.status === "rejected")
    .map((profile) => ({
      id: profile.id,
      fullName: profile.full_name ?? "—",
      email: profile.email ?? "—",
      rejectionReason: profile.rejection_reason,
    }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Users</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Approve new signups and assign quizzes to active students.
        </p>
      </div>

      <UsersTable pending={pending} active={active} rejected={rejected} />
    </div>
  );
}
