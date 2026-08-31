"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui";
import { levelLabel, type Difficulty } from "@/lib/quiz-engine";
import { LayoutGrid } from "lucide-react";

export interface DifficultyRow {
  difficulty: Difficulty;
  correct: number;
  wrong: number;
}

const ORDER: Difficulty[] = ["easy", "medium", "hard"];

export function DifficultyBreakdownChart({ data }: { data: DifficultyRow[] }) {
  const total = data.reduce((sum, row) => sum + row.correct + row.wrong, 0);

  if (total === 0) {
    return (
      <EmptyState
        icon={<LayoutGrid className="size-10" />}
        title="No answered questions in this range"
        description="Try widening the date range or clearing the quiz/course filter."
      />
    );
  }

  const byLevel = new Map(data.map((row) => [row.difficulty, row]));
  const chartData = ORDER.map((difficulty) => {
    const row = byLevel.get(difficulty);
    return {
      label: levelLabel(difficulty),
      Correct: row?.correct ?? 0,
      Wrong: row?.wrong ?? 0,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fill: "currentColor", fontSize: 12 }} className="text-fg-muted" />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-fg-muted"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Correct" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Wrong" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
