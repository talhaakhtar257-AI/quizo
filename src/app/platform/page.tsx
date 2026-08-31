import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { OrgsTable, type OrgRow } from "./OrgsTable";

export const metadata: Metadata = { title: "Platform" };

// The layout already gated this route to an allowlisted platform-owner
// email (src/app/platform/layout.tsx) — this page trusts that the same way
// every dashboard page trusts dashboard/layout.tsx, so it goes straight to
// the service-role client rather than re-deriving authorization.
export default async function PlatformPage() {
  const supabase = createServiceClient();

  const [{ data: orgs }, { data: studentProfiles }, { data: quizRows }, { count: totalAttempts }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, plan, is_suspended, created_at, profiles!organizations_owner_id_fkey(email)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("organization_id").eq("role", "student"),
      supabase.from("quizzes").select("organization_id"),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    ]);

  // Grouped in JS rather than one query per org — at this scale (a handful
  // of academies) that's simpler and cheaper than N+1 round trips or a new
  // SQL aggregate function just for this one screen.
  const studentCounts = new Map<string, number>();
  for (const row of studentProfiles ?? []) {
    studentCounts.set(row.organization_id, (studentCounts.get(row.organization_id) ?? 0) + 1);
  }
  const quizCounts = new Map<string, number>();
  for (const row of quizRows ?? []) {
    quizCounts.set(row.organization_id, (quizCounts.get(row.organization_id) ?? 0) + 1);
  }

  const rows: OrgRow[] = (orgs ?? []).map((org) => {
    const owner = org.profiles as unknown as { email: string } | null;
    return {
      id: org.id,
      name: org.name,
      ownerEmail: owner?.email ?? "—",
      plan: org.plan,
      isSuspended: org.is_suspended,
      studentCount: studentCounts.get(org.id) ?? 0,
      quizCount: quizCounts.get(org.id) ?? 0,
      createdAt: org.created_at,
    };
  });

  const totals = {
    academies: rows.length,
    students: rows.reduce((sum, row) => sum + row.studentCount, 0),
    quizzes: rows.reduce((sum, row) => sum + row.quizCount, 0),
    attempts: totalAttempts ?? 0,
  };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Platform overview</h1>
        <p className="mt-1 text-sm text-fg-secondary">Every academy on Quizo, at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TotalCard label="Academies" value={totals.academies} />
        <TotalCard label="Students" value={totals.students} />
        <TotalCard label="Quizzes" value={totals.quizzes} />
        <TotalCard label="Attempts" value={totals.attempts} />
      </div>

      <OrgsTable rows={rows} />
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-2xl font-bold text-fg">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-fg-secondary">{label}</p>
    </div>
  );
}
