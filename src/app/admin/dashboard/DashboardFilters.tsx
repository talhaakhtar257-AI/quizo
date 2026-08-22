"use client";

import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
}

interface Quiz {
  id: string;
  title: string;
  courseId: string;
}

export function DashboardFilters({
  courses,
  quizzes,
  from,
  to,
  course,
  quiz,
}: {
  courses: Course[];
  quizzes: Quiz[];
  from: string;
  to: string;
  course: string;
  quiz: string;
}) {
  const router = useRouter();

  function navigate(next: { from?: string; to?: string; course?: string; quiz?: string }) {
    const params = new URLSearchParams({
      from: next.from ?? from,
      to: next.to ?? to,
      course: next.course ?? course,
      quiz: next.quiz ?? quiz,
    });
    router.push(`/admin/dashboard?${params.toString()}`);
  }

  const quizOptions = course === "all" ? quizzes : quizzes.filter((q) => q.courseId === course);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-fg-secondary">From</label>
        <input
          type="date"
          value={from}
          onChange={(event) => navigate({ from: event.target.value })}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-fg-secondary">To</label>
        <input
          type="date"
          value={to}
          onChange={(event) => navigate({ to: event.target.value })}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-fg-secondary">Course</label>
        <select
          value={course}
          onChange={(event) => navigate({ course: event.target.value, quiz: "all" })}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-fg-secondary">Quiz</label>
        <select
          value={quiz}
          onChange={(event) => navigate({ quiz: event.target.value })}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">All quizzes</option>
          {quizOptions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
