"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Activity } from "lucide-react";

export interface AttemptsPerDayPoint {
  day: string;
  count: number;
}

export function AttemptsPerDayChart({ data }: { data: AttemptsPerDayPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="size-10" />}
        title="No attempts in this range"
        description="Try widening the date range or clearing the quiz/course filter."
      />
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="day"
            tickFormatter={(value: string) => formatDate(value)}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-fg-muted"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-fg-muted"
          />
          <Tooltip
            labelFormatter={(value) => formatDate(String(value))}
            formatter={(value) => [value, "Attempts"]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
