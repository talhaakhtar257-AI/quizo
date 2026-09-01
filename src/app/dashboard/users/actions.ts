"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/require-admin";
import { requirePermission } from "@/lib/permissions";
import { planLimitError } from "@/lib/plan-limits";

// Enrollment approval is per-COURSE, not a global account gate — a student
// can be pending in one course and approved in another at the same time.
// This is a deliberate difference from v1, where profiles.status blocked
// login itself; here a student always logs in, and enrollment status only
// gates access to that one course. See docs/FEATURES.md §3.

async function sendEmail(
  route: "send-approval-email" | "send-rejection-email",
  body: Record<string, unknown>
): Promise<boolean> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host");
    if (!host) return false;
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const cookie = hdrs.get("cookie");

    const response = await fetch(`${protocol}://${host}/api/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // A server-side fetch is a brand new HTTP request — it doesn't
        // inherit the browser's cookies automatically, so forward them.
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function loadEnrollment(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  enrollmentId: string
) {
  const { data, error } = await supabase
    .from("enrollments")
    .select(
      "id, student_id, course_id, profiles!enrollments_student_id_fkey(full_name, email), courses(name)"
    )
    .eq("id", enrollmentId)
    .single();
  if (error || !data) throw new Error("Enrollment not found.");
  return data;
}

// docs/FEATURES.md §11 lists "Student enrolls → COUNT enrollments vs
// max_students_per_course" as an enforcement point, but nothing ever
// implemented it: the plan's cap was only stamped onto courses.max_students
// at creation time, so approvals could run past it indefinitely. Checked here
// against the CURRENT plan, so upgrading an academy actually raises its cap
// instead of leaving old courses stuck at the limit they were created with.
async function assertCourseHasRoom(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  courseId: string
) {
  const { data: course } = await supabase
    .from("courses")
    .select("organization_id")
    .eq("id", courseId)
    .single();
  if (!course) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", course.organization_id)
    .single();
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("max_students_per_course")
    .eq("plan", org?.plan ?? "free")
    .single();

  const cap = limits?.max_students_per_course ?? 25;
  if (cap === -1) return;

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("status", "approved");

  if ((count ?? 0) >= cap) {
    throw planLimitError(
      `This course is full — the ${org?.plan ?? "free"} plan allows ${cap} approved students per course.`
    );
  }
}

export async function approveEnrollment(enrollmentId: string) {
  const { supabase, userId } = await requirePermission("manage_enrollments");

  const enrollment = await loadEnrollment(supabase, enrollmentId);
  await assertCourseHasRoom(supabase, enrollment.course_id);

  const { error } = await supabase
    .from("enrollments")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", enrollmentId);
  if (error) throw new Error("Could not approve this enrollment.");

  revalidatePath("/dashboard/users");
  const profile = enrollment.profiles as unknown as { full_name: string; email: string } | null;
  const course = enrollment.courses as unknown as { name: string } | null;
  const emailSent = profile?.email
    ? await sendEmail("send-approval-email", {
        email: profile.email,
        name: profile.full_name,
        courseName: course?.name,
      })
    : false;
  return { emailSent };
}

export async function bulkApproveEnrollments(enrollmentIds: string[]) {
  const { supabase, userId } = await requirePermission("manage_enrollments");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, course_id, profiles!enrollments_student_id_fkey(full_name, email), courses(name)")
    .in("id", enrollmentIds);

  // Same per-course cap as the single approve path — otherwise bulk approve
  // would be a trivial way around it.
  for (const courseId of new Set((enrollments ?? []).map((row) => row.course_id))) {
    await assertCourseHasRoom(supabase, courseId);
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .in("id", enrollmentIds);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/users");

  let emailFailures = 0;
  for (const enrollment of enrollments ?? []) {
    const profile = enrollment.profiles as unknown as { full_name: string; email: string } | null;
    const course = enrollment.courses as unknown as { name: string } | null;
    const sent = profile?.email
      ? await sendEmail("send-approval-email", {
          email: profile.email,
          name: profile.full_name,
          courseName: course?.name,
        })
      : false;
    if (!sent) emailFailures += 1;
  }

  return { approvedCount: enrollments?.length ?? 0, emailFailures };
}

export async function rejectEnrollment(enrollmentId: string, reason: string) {
  const { supabase } = await requirePermission("manage_enrollments");
  const enrollment = await loadEnrollment(supabase, enrollmentId);

  const { error } = await supabase
    .from("enrollments")
    .update({ status: "rejected", rejected_reason: reason.trim() || null })
    .eq("id", enrollmentId);
  if (error) throw new Error("Could not reject this enrollment.");

  revalidatePath("/dashboard/users");
  const profile = enrollment.profiles as unknown as { full_name: string; email: string } | null;
  const course = enrollment.courses as unknown as { name: string } | null;
  const emailSent = profile?.email
    ? await sendEmail("send-rejection-email", {
        email: profile.email,
        name: profile.full_name,
        courseName: course?.name,
        reason: reason.trim() || undefined,
      })
    : false;
  return { emailSent };
}

export async function moveEnrollmentToPending(enrollmentId: string) {
  const { supabase } = await requirePermission("manage_enrollments");
  const { error } = await supabase
    .from("enrollments")
    .update({ status: "pending", rejected_reason: null })
    .eq("id", enrollmentId);
  if (error) throw new Error("Could not update this enrollment.");
  revalidatePath("/dashboard/users");
}
