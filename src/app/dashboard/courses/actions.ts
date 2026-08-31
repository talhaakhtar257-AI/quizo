"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { requirePermission } from "@/lib/permissions";
import { generateInviteCode } from "@/lib/invite-code";
import { planLimitError } from "@/lib/plan-limits";

const courseSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().max(500).optional(),
  subject: z.string().max(50).optional(),
});

export interface CourseInput {
  name: string;
  description: string;
  subject?: string;
}

export async function createCourse(input: CourseInput) {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { supabase, userId, orgId } = await requirePermission("create_course");

  // Plan limit — docs/FEATURES.md §2: Free = max 3 courses.
  const [{ data: org }, { count: courseCount }] = await Promise.all([
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase.from("courses").select("id", { count: "exact", head: true }),
  ]);
  const { data: limits } = await supabase
    .from("plan_limits")
    .select("max_courses, max_students_per_course")
    .eq("plan", org?.plan ?? "free")
    .single();

  if (limits && limits.max_courses !== -1 && (courseCount ?? 0) >= limits.max_courses) {
    throw planLimitError(
      `You've reached the ${org?.plan ?? "free"} plan limit of ${limits.max_courses} courses.`
    );
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const maxStudents = limits?.max_students_per_course ?? 25;

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      organization_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      subject: parsed.data.subject || null,
      invite_code: code,
      invite_code_expires_at: expiresAt,
      max_students: maxStudents,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error("Could not create the course. Please try again.");

  const { error: codeError } = await supabase.from("invite_codes").insert({
    organization_id: orgId,
    course_id: course.id,
    code,
    max_uses: maxStudents,
    expires_at: expiresAt,
    created_by: userId,
  });
  if (codeError) throw new Error("Course was created, but the invite code failed to save.");

  revalidatePath("/dashboard/courses");
  return course;
}

export async function updateCourse(courseId: string, input: CourseInput) {
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { supabase } = await requirePermission("edit_course");
  const { error } = await supabase
    .from("courses")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      subject: parsed.data.subject || null,
    })
    .eq("id", courseId);

  if (error) throw new Error("Could not save. Please try again.");
  revalidatePath("/dashboard/courses");
  revalidatePath(`/dashboard/courses/${courseId}`);
}

export async function getCourseDeleteImpact(courseId: string) {
  const supabase = await requireAdmin();

  const { data: quizzes, count: quizCount } = await supabase
    .from("quizzes")
    .select("id", { count: "exact" })
    .eq("course_id", courseId);

  let questionCount = 0;
  let attemptCount = 0;
  let certificateCount = 0;
  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);

  if (quizIds.length > 0) {
    const { data: pools } = await supabase.from("quiz_pools").select("id").in("quiz_id", quizIds);
    const poolIds = (pools ?? []).map((pool) => pool.id);
    if (poolIds.length > 0) {
      const { count } = await supabase
        .from("pool_questions")
        .select("id", { count: "exact", head: true })
        .in("pool_id", poolIds);
      questionCount = count ?? 0;
    }

    const { count: attemptCountResult } = await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .in("quiz_id", quizIds);
    attemptCount = attemptCountResult ?? 0;
  }

  const { count: certCount } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);
  certificateCount = certCount ?? 0;

  return { quizCount: quizCount ?? 0, questionCount, attemptCount, certificateCount };
}

export async function deleteCourse(courseId: string) {
  const { supabase } = await requirePermission("delete_course");
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error("Could not delete this course. Please try again.");
  revalidatePath("/dashboard/courses");
}
