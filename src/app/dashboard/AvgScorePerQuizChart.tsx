"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui";
import { BarChart3 } from "lucide-react";

export interface QuizScoreRow {
  quizId: string;
  quizTitle: string;
  avgPercentage: number;
  passingPercent: number;
  attemptCount: number;
}

// Custom bar shape: draws the bar itself plus a thin vertical tick at the
// quiz's own passing percentage, since every quiz can have a different
// threshold — a single chart-wide ReferenceLine can't express that.
function BarWithThreshold(props: unknown) {
  const { x, y, width, height, payload } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    payload: QuizScoreRow;
  };
  const passed = payload.avgPercentage >= payload.passingPercent;
  const thresholdX = x + (payload.passingPercent / 100) * width;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={Math.max(width, 0)}
        height={height}
        fill={passed ? "var(--color-success)" : "var(--color-danger)"}
        rx={4}
      />
      <line
        x1={thresholdX}
        x2={thresholdX}
        y1={y - 3}
        y2={y + height + 3}
        stroke="var(--color-fg)"
        strokeWidth={2}
      />
    </g>
  );
}

export function AvgScorePerQuizChart({ data }: { data: QuizScoreRow[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-10" />}
        title="No submitted attempts in this range"
        description="Try widening the date range or clearing the quiz/course filter."
      />
    );
  }

  return (
    <div>
      <div style={{ height: Math.max(data.length * 44, 120) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "currentColor", fontSize: 12 }}
              className="text-fg-muted"
            />
            <YAxis
              type="category"
              dataKey="quizTitle"
              width={160}
              tick={{ fill: "currentColor", fontSize: 12 }}
              className="text-fg-muted"
            />
            <Tooltip
              formatter={(value, _name, item) => [
                `${value}% avg (passing ${item.payload.passingPercent}%, ${item.payload.attemptCount} attempts)`,
                "Average score",
              ]}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="avgPercentage" shape={BarWithThreshold} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-secondary">
        <span className="inline-block h-2.5 w-0.5 bg-fg" /> marks each quiz&apos;s passing percentage
      </p>
    </div>
  );
}
