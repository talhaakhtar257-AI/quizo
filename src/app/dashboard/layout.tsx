import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { getPermissionFlags } from "@/lib/permissions";
import { AdminShell } from "@/components/admin/AdminShell";

// The pending-requests badge is computed here, and Next.js does not re-render
// a layout on client-side navigation between sibling routes — so without this
// the red count stayed stale until a full page reload.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (!currentUser.profile.is_active) redirect("/login?deactivated=1");
  const isAdminOrSubAdmin =
    currentUser.profile.role === "admin" || currentUser.profile.role === "sub_admin";
  if (!isAdminOrSubAdmin) redirect("/student");

  const supabase = await createClient();
  // Org-scoped automatically by RLS ("Org admins see enrollments" on
  // enrollments) — no explicit organization_id filter needed here.
  const { count: pendingCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // UX only, not the security boundary — hides nav items a sub-admin has no
  // permission to act on. Every underlying route still checks for itself.
  const flags = await getPermissionFlags();

  return (
    <AdminShell
      userName={currentUser.profile.full_name ?? currentUser.email}
      pendingCount={pendingCount ?? 0}
      hideStudents={!flags.view_students}
      hideReports={!flags.view_analytics}
    >
      {children}
    </AdminShell>
  );
}
