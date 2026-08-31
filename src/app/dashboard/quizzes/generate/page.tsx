import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GenerateForm } from "./GenerateForm";

export const metadata: Metadata = { title: "Generate Questions" };

export default async function GenerateQuestionsPage(
  props: PageProps<"/dashboard/quizzes/generate">
) {
  const searchParams = await props.searchParams;
  const initialCourseId =
    typeof searchParams.courseId === "string" ? searchParams.courseId : undefined;
  const initialContentId =
    typeof searchParams.contentId === "string" ? searchParams.contentId : undefined;

  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: contentUploads } = await supabase
    .from("content_uploads")
    .select("id, course_id, raw_text")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold text-fg">Generate questions with AI</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          Gemini will read your saved content and write scenario-based
          questions at all three difficulty levels.
        </p>
      </div>
      <GenerateForm
        courses={courses ?? []}
        contentUploads={contentUploads ?? []}
        initialCourseId={initialCourseId}
        initialContentId={initialContentId}
      />
    </div>
  );
}
