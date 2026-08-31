import { Clock, Shield, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui";

const items = [
  {
    icon: Clock,
    problem: "Creating quizzes takes hours",
    solution:
      "AI generates 30 graded questions in 10 seconds from any topic. Just type what you want to test.",
  },
  {
    icon: Shield,
    problem: "Students share answers and cheat",
    solution:
      "Every attempt gets shuffled questions, shuffled options, tab detection, and fullscreen lock. No two screens look the same.",
  },
  {
    icon: BarChart3,
    problem: "No idea who's struggling",
    solution:
      "Adaptive difficulty adjusts in real time. Easy students get harder questions. Struggling students get support. You see it all in analytics.",
  },
];

export function ProblemSolution() {
  return (
    <section className="bg-background px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-semibold text-fg">
          Why Academies Choose Quizo
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item) => (
            <Card key={item.problem}>
              <item.icon className="size-8 text-danger" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-fg line-through decoration-danger/60">
                {item.problem}
              </p>
              <p className="mt-2 text-sm text-fg-secondary">{item.solution}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
