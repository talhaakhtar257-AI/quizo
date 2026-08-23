import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Courses" };
import { buttonVariants } from "@/components/ui";
import { CoursesTable, type CourseRow } from "./CoursesTable";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, created_at, course_outlines(count), quizzes(count)")
    .order("created_at", { ascending: false });

  const rows: CourseRow[] = (courses ?? []).map((course) => ({
    id: course.id,
    title: course.title,
    createdAt: course.created_at,
    topicCount: course.course_outlines[0]?.count ?? 0,
    quizCount: course.quizzes[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Courses</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Organize your study material into courses.
          </p>
        </div>
        {rows.length > 0 && (
          <Link href="/admin/courses/new" className={buttonVariants()}>
            <Plus className="size-4" /> Add course
          </Link>
        )}
      </div>

      <CoursesTable rows={rows} />
    </div>
  );
}
