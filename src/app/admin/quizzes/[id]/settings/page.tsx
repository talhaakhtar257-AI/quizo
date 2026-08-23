import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { QuizForm } from "../../QuizForm";

export const metadata: Metadata = { title: "Quiz Settings" };

export default async function QuizSettingsPage(
  props: PageProps<"/admin/quizzes/[id]/settings">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, course_id, timer_minutes, passing_percent, questions_to_show, difficulty_mode, max_attempts, is_published"
    )
    .eq("id", id)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title", { ascending: true });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-fg">Quiz settings</h1>
      <div className="mt-6">
        <QuizForm courses={courses ?? []} quiz={quiz} />
      </div>
    </div>
  );
}
