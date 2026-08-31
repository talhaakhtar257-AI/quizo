import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../../CourseForm";

export const metadata: Metadata = { title: "Edit Course" };

export default async function EditCoursePage(
  props: PageProps<"/dashboard/courses/[id]/edit">
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, name, description, subject")
    .eq("id", id)
    .maybeSingle();

  if (!course) notFound();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-fg">Edit course</h1>
      <div className="mt-6">
        <CourseForm course={course} />
      </div>
    </div>
  );
}
