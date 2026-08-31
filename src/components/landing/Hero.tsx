import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui";

// No real product screenshot exists yet (the dashboard itself isn't built
// until Phase E) — the browser-frame mockup below is a stylized stand-in
// built from the same design tokens as the real app, swapped for an actual
// screenshot once one exists.
export function Hero() {
  return (
    <section className="bg-surface px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-faint px-3 py-1 text-xs font-semibold text-secondary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI-Powered Quiz Platform
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight text-fg md:text-5xl">
            Create Adaptive Quizzes in Seconds, Not Hours
          </h1>

          <p className="mt-4 text-lg text-fg-secondary">
            AI generates quizzes that adapt to each student&apos;s level.
            Anti-cheat built in. Free forever for up to 3 courses.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free — No Credit Card
              </Button>
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-secondary hover:underline"
            >
              See how it works ↓
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-secondary">
            {["Free forever", "No credit card", "Set up in 2 minutes"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border border-border shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-border bg-surface-raised px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-danger/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
          </div>
          <div className="space-y-3 bg-background p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-secondary">
              <Sparkles className="size-4" aria-hidden="true" />
              Generating quiz: JavaScript Basics
            </div>
            {[
              { label: "Easy", width: "w-full" },
              { label: "Medium", width: "w-5/6" },
              { label: "Hard", width: "w-4/6" },
            ].map((row) => (
              <div key={row.label} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-muted">{row.label}</span>
                  <span className="text-xs text-success">✓ Generated</span>
                </div>
                <div className={`h-2 rounded-full bg-primary-subtle ${row.width}`}>
                  <div className="h-2 w-full rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
