import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Courses" };
import { buttonVariants, LoadFailed} from "@/components/ui";
import { CoursesTable, type CourseRow } from "./CoursesTable";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      "id, name, invite_code, invite_code_expires_at, max_students, created_at, quizzes(count), enrollments(count)"
    )
    .order("created_at", { ascending: false });

  const rows: CourseRow[] = (courses ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    inviteCode: course.invite_code,
    inviteExpiresAt: course.invite_code_expires_at,
    maxStudents: course.max_students,
    studentCount: course.enrollments[0]?.count ?? 0,
    quizCount: course.quizzes[0]?.count ?? 0,
    createdAt: course.created_at,
  }));

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg">Courses</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Organize your students and quizzes into courses.
          </p>
        </div>
        {rows.length > 0 && (
          <Link href="/dashboard/courses/new" className={buttonVariants()}>
            <Plus className="size-4" /> Add course
          </Link>
        )}
      </div>

      {error ? <LoadFailed what="your courses" /> : <CoursesTable rows={rows} />}
    </div>
  );
}
