import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPermissionFlags } from "@/lib/permissions";
import {
  UsersTable,
  type PendingEnrollmentRow,
  type ApprovedEnrollmentRow,
  type RejectedEnrollmentRow,
} from "./UsersTable";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const flags = await getPermissionFlags();
  if (!flags.view_students) redirect("/dashboard");

  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, status, created_at, approved_at, rejected_reason, profiles!enrollments_student_id_fkey(full_name, email), courses(name)"
    )
    .order("created_at", { ascending: false });

  const all = enrollments ?? [];

  const pending: PendingEnrollmentRow[] = all
    .filter((row) => row.status === "pending")
    .map((row) => {
      const profile = row.profiles as unknown as { full_name: string; email: string } | null;
      const course = row.courses as unknown as { name: string } | null;
      return {
        id: row.id,
        studentName: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        courseName: course?.name ?? "—",
        requestedAt: row.created_at,
      };
    });

  const approved: ApprovedEnrollmentRow[] = all
    .filter((row) => row.status === "approved")
    .map((row) => {
      const profile = row.profiles as unknown as { full_name: string; email: string } | null;
      const course = row.courses as unknown as { name: string } | null;
      return {
        id: row.id,
        studentName: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        courseName: course?.name ?? "—",
        approvedAt: row.approved_at,
      };
    });

  const rejected: RejectedEnrollmentRow[] = all
    .filter((row) => row.status === "rejected")
    .map((row) => {
      const profile = row.profiles as unknown as { full_name: string; email: string } | null;
      const course = row.courses as unknown as { name: string } | null;
      return {
        id: row.id,
        studentName: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        courseName: course?.name ?? "—",
        rejectionReason: row.rejected_reason,
      };
    });

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Students</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Approve enrollment requests. A student can be pending in one course and approved in
          another at the same time.
        </p>
      </div>

      <UsersTable pending={pending} approved={approved} rejected={rejected} />
    </div>
  );
}
