"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/ui";
import { PieChart as PieChartIcon } from "lucide-react";

export function PassFailDonut({
  passedCount,
  failedCount,
}: {
  passedCount: number;
  failedCount: number;
}) {
  const total = passedCount + failedCount;

  if (total === 0) {
    return (
      <EmptyState
        icon={<PieChartIcon className="size-10" />}
        title="No submitted attempts in this range"
        description="Try widening the date range or clearing the quiz/course filter."
      />
    );
  }

  const passRate = Math.round((passedCount / total) * 100);
  const data = [
    { name: "Pass", value: passedCount },
    { name: "Fail", value: failedCount },
  ];

  return (
    <div>
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill="var(--color-success)" />
              <Cell fill="var(--color-danger)" />
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} (${Math.round((Number(value) / total) * 100)}%)`, name]}
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-fg">{passRate}%</span>
          <span className="text-xs text-fg-secondary">pass rate</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-fg-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-success)" }} />
          Pass ({passedCount})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-danger)" }} />
          Fail ({failedCount})
        </span>
      </div>
    </div>
  );
}
