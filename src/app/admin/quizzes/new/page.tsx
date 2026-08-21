import { createClient } from "@/lib/supabase/server";
import { QuizForm } from "../QuizForm";

export default async function NewQuizPage(
  props: PageProps<"/admin/quizzes/new">
) {
  const searchParams = await props.searchParams;
  const initialCourseId =
    typeof searchParams.courseId === "string" ? searchParams.courseId : undefined;

  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title", { ascending: true });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-fg">New quiz</h1>
      <div className="mt-6">
        <QuizForm courses={courses ?? []} initialCourseId={initialCourseId} />
      </div>
    </div>
  );
}
