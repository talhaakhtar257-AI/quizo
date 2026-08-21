"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/format";

export interface ProgressPoint {
  date: string;
  percentage: number;
}

export function ProgressChart({
  data,
  passingPercent,
}: {
  data: ProgressPoint[];
  passingPercent: number;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value)}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-fg-muted"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-fg-muted"
          />
          <Tooltip
            labelFormatter={(value) => formatDate(String(value))}
            formatter={(value) => [`${value}%`, "Score"]}
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={passingPercent}
            stroke="var(--color-fg-muted)"
            strokeDasharray="4 4"
            label={{ value: `Passing ${passingPercent}%`, position: "insideTopRight", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="percentage"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
