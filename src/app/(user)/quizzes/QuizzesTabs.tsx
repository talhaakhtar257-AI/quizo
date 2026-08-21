"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { AssignedQuizCard } from "@/components/user/AssignedQuizCard";
import type { AssignmentQuiz, AttemptSummary } from "@/lib/quiz-status";

export interface AssignmentEntry {
  assignmentId: string;
  deadline: string | null;
  quiz: AssignmentQuiz;
  attempts: AttemptSummary[];
}

type Tab = "all" | "not_started" | "in_progress" | "completed";

function categorize(attempts: AttemptSummary[]): Exclude<Tab, "all"> {
  if (attempts.some((attempt) => attempt.status === "in_progress")) return "in_progress";
  if (attempts.length > 0) return "completed";
  return "not_started";
}

export function QuizzesTabs({ entries }: { entries: AssignmentEntry[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const categorized = useMemo(
    () => entries.map((entry) => ({ entry, category: categorize(entry.attempts) })),
    [entries]
  );

  const filtered =
    tab === "all" ? categorized : categorized.filter((item) => item.category === tab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "not_started", label: "Not Started" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-10" />}
        title="No quizzes assigned yet"
        description="Your admin will assign quizzes here once they're ready."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.key
                ? "border-primary text-primary"
                : "border-transparent text-fg-secondary hover:text-fg"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-fg-secondary">No quizzes in this category.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map(({ entry }) => (
            <AssignedQuizCard
              key={entry.assignmentId}
              quiz={entry.quiz}
              deadline={entry.deadline}
              attempts={entry.attempts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
