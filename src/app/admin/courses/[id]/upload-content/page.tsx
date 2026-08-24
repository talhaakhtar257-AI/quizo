import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContentUploader } from "./ContentUploader";
import { UploadsList } from "./UploadsList";

export const metadata: Metadata = { title: "Upload Content" };

export default async function UploadContentPage(
  props: PageProps<"/admin/courses/[id]/upload-content">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  const { data: uploads } = await supabase
    .from("content_uploads")
    .select("id, source_type, raw_text, original_filename, created_at")
    .eq("course_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <div>
        <Link
          href={`/admin/courses/${id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; {course.title}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-fg">Upload content</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Paste study material, upload a screenshot, or upload a .txt/.md
          file — this is what Gemini will turn into quiz questions.
        </p>
      </div>

      <ContentUploader courseId={course.id} />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg">Previous uploads</h2>
        <UploadsList courseId={course.id} uploads={uploads ?? []} />
      </section>
    </div>
  );
}
