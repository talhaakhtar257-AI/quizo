import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NewQuestionForm } from "./NewQuestionForm";

export const metadata: Metadata = { title: "Add Question" };

export default async function NewQuestionPage(
  props: PageProps<"/admin/quizzes/[id]/questions/new">
) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();

  if (!quiz) notFound();

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div>
        <Link
          href={`/admin/quizzes/${quiz.id}/questions`}
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; Back to questions
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-fg">Add a question</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          For &quot;{quiz.title}&quot;. Manually written questions are approved automatically.
        </p>
      </div>

      <NewQuestionForm quizId={quiz.id} />
    </div>
  );
}
