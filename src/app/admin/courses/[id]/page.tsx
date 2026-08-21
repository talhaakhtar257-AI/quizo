import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, ListChecks, Upload, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants, EmptyState, Badge } from "@/components/ui";
import { OutlineList } from "./OutlineList";

export default async function CourseDetailPage(
  props: PageProps<"/admin/courses/[id]">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const { data: topics } = await supabase
    .from("course_outlines")
    .select("id, topic_title, topic_description, topic_order")
    .eq("course_id", id)
    .order("topic_order", { ascending: true });

  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, is_published")
    .eq("course_id", id)
    .order("created_at", { ascending: false });

  const { count: uploadCount } = await supabase
    .from("content_uploads")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id);

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">{course.title}</h1>
        {course.description && (
          <p className="mt-1 text-sm text-fg-secondary">{course.description}</p>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg">Outline</h2>
        <OutlineList courseId={course.id} topics={topics ?? []} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-fg">Content</h2>
          <Link
            href={`/admin/courses/${course.id}/upload-content`}
            className={buttonVariants({ size: "sm", variant: "secondary" })}
          >
            <Upload className="size-4" /> Upload content
          </Link>
        </div>
        <p className="text-sm text-fg-secondary">
          {uploadCount ?? 0} upload{uploadCount === 1 ? "" : "s"} saved for this
          course.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-fg">Quizzes</h2>
          <div className="flex gap-2">
            <Link
              href={`/admin/quizzes/generate?courseId=${course.id}`}
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              <Sparkles className="size-4" /> Generate with AI
            </Link>
            <Link
              href={`/admin/quizzes/new?courseId=${course.id}`}
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
                  <Badge variant={quiz.is_published ? "success" : "neutral"}>
                    {quiz.is_published ? "Published" : "Draft"}
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
