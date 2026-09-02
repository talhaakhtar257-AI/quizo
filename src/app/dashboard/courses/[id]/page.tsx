import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ListChecks, Upload, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Course Detail" };
import { buttonVariants, EmptyState, Badge, Card } from "@/components/ui";
import { InviteCodeCard } from "./InviteCodeCard";

export default async function CourseDetailPage(
  props: PageProps<"/dashboard/courses/[id]">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, name, description, subject, invite_code, invite_code_expires_at, max_students")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const [
    { data: quizzes },
    { count: uploadCount },
    { count: approvedCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, status")
      .eq("course_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("content_uploads")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id)
      .eq("status", "approved"),
    supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id)
      .eq("status", "pending"),
  ]);

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">{course.name}</h1>
        {course.subject && <p className="mt-1 text-sm text-fg-secondary">{course.subject}</p>}
        {course.description && (
          <p className="mt-1 text-sm text-fg-secondary">{course.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InviteCodeCard
          courseId={course.id}
          initialCode={course.invite_code}
          initialExpiresAt={course.invite_code_expires_at}
        />
        <Card className="p-5">
          <h3 className="text-sm font-medium text-fg-secondary">Students</h3>
          <p className="mt-2 text-2xl font-bold text-fg">
            {approvedCount ?? 0} <span className="text-base font-normal text-fg-secondary">/ {course.max_students}</span>
          </p>
          {(pendingCount ?? 0) > 0 && (
            <Link
              href={`/dashboard/users?course=${course.id}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:underline"
            >
              <Users className="size-4" />
              {pendingCount} pending approval
            </Link>
          )}
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-fg">Content</h2>
          {!!uploadCount && (
            <Link
              href={`/dashboard/courses/${course.id}/upload-content`}
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              <Upload className="size-4" /> Upload content
            </Link>
          )}
        </div>
        {uploadCount ? (
          <p className="text-sm text-fg-secondary">
            {uploadCount} upload{uploadCount === 1 ? "" : "s"} saved for this
            course.
          </p>
        ) : (
          <EmptyState
            icon={<Upload className="size-10" />}
            title="No content uploaded yet"
            description="Upload your study material as text or a screenshot so AI can generate questions from it."
            action={
              <Link
                href={`/dashboard/courses/${course.id}/upload-content`}
                className={buttonVariants({ size: "sm" })}
              >
                <Upload className="size-4" /> Upload content
              </Link>
            }
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-fg">Quizzes</h2>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/quizzes/generate?courseId=${course.id}`}
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              <Sparkles className="size-4" /> Generate with AI
            </Link>
            <Link
              href={`/dashboard/quizzes/new?courseId=${course.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" /> Create quiz
            </Link>
          </div>
        </div>

        {!quizzes || quizzes.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="size-10" />}
            title="No quizzes yet"
            description="Create a quiz for this course once you have approved questions."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border">
              {quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="font-medium text-fg">{quiz.title}</span>
                  <Badge variant={quiz.status === "published" ? "success" : "neutral"}>
                    {quiz.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
