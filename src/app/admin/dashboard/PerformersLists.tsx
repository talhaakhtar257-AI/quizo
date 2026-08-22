import Link from "next/link";
import { Award, TrendingDown, Users } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";

export interface StudentPerformanceRow {
  userId: string;
  fullName: string;
  email: string;
  avgPercentage: number;
  attemptCount: number;
  latestPassed: boolean;
}

function StudentRow({ student, rank }: { student: StudentPerformanceRow; rank: number }) {
  return (
    <Link
      href={`/admin/users/${student.userId}/attempts`}
      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-surface-raised"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary">
          {rank}
        </span>
        <div>
          <p className="text-sm font-medium text-fg">{student.fullName}</p>
          <p className="text-xs text-fg-secondary">
            {student.attemptCount} attempt{student.attemptCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!student.latestPassed && <Badge variant="danger">Failed last</Badge>}
        <span className="text-sm font-semibold text-fg">{student.avgPercentage}%</span>
      </div>
    </Link>
  );
}

export function PerformersLists({ students }: { students: StudentPerformanceRow[] }) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-10" />}
        title="No submitted attempts in this range"
        description="Try widening the date range or clearing the quiz/course filter."
      />
    );
  }

  const topPerformers = [...students].sort((a, b) => b.avgPercentage - a.avgPercentage).slice(0, 5);

  const needsAttention = [...students]
    .sort((a, b) => {
      const scoreA = a.latestPassed ? a.avgPercentage : a.avgPercentage - 1000;
      const scoreB = b.latestPassed ? b.avgPercentage : b.avgPercentage - 1000;
      return scoreA - scoreB;
    })
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg">
          <Award className="size-4" /> Top Performers
        </h3>
        <div className="space-y-1">
          {topPerformers.map((student, i) => (
            <StudentRow key={student.userId} student={student} rank={i + 1} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-fg">
          <TrendingDown className="size-4" /> Needs Attention
        </h3>
        <div className="space-y-1">
          {needsAttention.map((student, i) => (
            <StudentRow key={student.userId} student={student} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
