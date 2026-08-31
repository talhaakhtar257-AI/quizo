import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { QuizForm } from "../../QuizForm";

export const metadata: Metadata = { title: "Quiz Settings" };

export default async function QuizSettingsPage(
  props: PageProps<"/dashboard/quizzes/[id]/settings">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, title, topic, description, course_id, time_limit_minutes, passing_score, questions_to_show, difficulty_mode, max_attempts, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!quiz) notFound();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-fg">Quiz settings</h1>
      <div className="mt-6">
        <QuizForm courses={courses ?? []} quiz={quiz} />
      </div>
    </div>
  );
}
