"use client";

import { Sparkles, Clock, BarChart3, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";

// Same "no real screenshot yet" situation as Hero.tsx — these are stylized
// stand-ins built from design tokens, swapped for real screenshots once the
// dashboard (Phase E) and quiz player (Phase J) exist. Built from actual
// skeleton UI rather than a lone centered icon in a big empty box — an
// earlier version did that and, at the section's real on-page height, read
// as a broken/blank section rather than a placeholder.
const tabs = [
  {
    value: "builder",
    label: "Quiz Builder",
    caption:
      "Type a topic and AI generates questions instantly. Edit, add, or remove before publishing.",
    icon: Sparkles,
    mock: (
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <Sparkles className="size-4" aria-hidden="true" />
          Topic: JavaScript array methods
        </div>
        {["Easy", "Medium", "Hard"].map((level, i) => (
          <div key={level} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted">{level}</span>
              <span className="text-xs text-success">✓ 10 questions</span>
            </div>
            <div className="h-2 w-full rounded-full bg-primary-subtle">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${90 - i * 12}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "student",
    label: "Student View",
    caption:
      "Clean, focused quiz experience. One question at a time. Timer keeps them on track.",
    icon: Clock,
    mock: (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between text-xs text-fg-secondary">
          <span>Question 4 of 10</span>
          <span className="font-mono">08:42</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-raised">
          <div className="h-1.5 w-2/5 rounded-full bg-secondary" />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 h-3 w-3/4 rounded bg-fg-muted/30" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`rounded-md border p-2.5 ${i === 1 ? "border-secondary bg-secondary-faint" : "border-border"}`}
              >
                <div className="h-2.5 w-1/2 rounded bg-fg-muted/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    value: "analytics",
    label: "Analytics",
    caption:
      "Know exactly how your students are performing. Drill down by quiz, student, or question.",
    icon: BarChart3,
    mock: (
      <div className="grid grid-cols-2 gap-4 p-6">
        {[
          { label: "Average score", value: "74%" },
          { label: "Pass rate", value: "68%" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-fg-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-fg">{stat.value}</p>
          </div>
        ))}
        <div className="col-span-2 flex h-24 items-end gap-2 rounded-lg border border-border bg-surface p-3">
          {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-secondary" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-xs text-success">
          <Check className="size-3.5" aria-hidden="true" />
          3 students earned a certificate this week
        </div>
      </div>
    ),
  },
];

export function ProductShowcase() {
  return (
    <section className="bg-surface-raised px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-semibold text-fg">See Quizo in Action</h2>

        <Tabs defaultValue="builder" className="mt-10">
          <TabsList className="mx-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              <div className="overflow-hidden rounded-xl border border-border shadow-xl">
                <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2.5">
                  <span className="size-2.5 rounded-full bg-danger/60" />
                  <span className="size-2.5 rounded-full bg-warning/60" />
                  <span className="size-2.5 rounded-full bg-success/60" />
                </div>
                <div className="bg-background">{tab.mock}</div>
              </div>
              <p className="mt-4 text-center text-sm text-fg-secondary">{tab.caption}</p>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
