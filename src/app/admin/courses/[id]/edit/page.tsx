import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "../../CourseForm";

export default async function EditCoursePage(
  props: PageProps<"/admin/courses/[id]/edit">
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description")
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
