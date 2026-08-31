"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { generateInviteCode } from "@/lib/invite-code";

// docs/FEATURES.md §2: regenerating deactivates the old code (it stays in
// the table for history) and creates a new one. Free plan cannot raise
// capacity by regenerating — max_uses is carried over from the course's
// existing max_students, never bumped up here.
export async function regenerateInviteCode(courseId: string) {
  const { supabase, userId } = await requirePermission("edit_course");

  const { data: course } = await supabase
    .from("courses")
    .select("organization_id, max_students")
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found.");

  const { error: deactivateError } = await supabase
    .from("invite_codes")
    .update({ is_active: false })
    .eq("course_id", courseId)
    .eq("is_active", true);
  if (deactivateError) throw new Error("Could not regenerate the code. Please try again.");

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("invite_codes").insert({
    organization_id: course.organization_id,
    course_id: courseId,
    code,
    max_uses: course.max_students,
    expires_at: expiresAt,
    created_by: userId,
  });
  if (insertError) throw new Error("Could not regenerate the code. Please try again.");

  const { error: updateError } = await supabase
    .from("courses")
    .update({ invite_code: code, invite_code_expires_at: expiresAt })
    .eq("id", courseId);
  if (updateError) throw new Error("Could not regenerate the code. Please try again.");

  revalidatePath(`/dashboard/courses/${courseId}`);
  return { code, expiresAt };
}
