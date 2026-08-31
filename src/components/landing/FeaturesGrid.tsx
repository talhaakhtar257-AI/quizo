import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Award,
  Building2,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui";

const features = [
  {
    icon: Sparkles,
    title: "AI Quiz Generation",
    description:
      "Paste any topic — AI creates MCQs at 3 difficulty levels. Review and edit before publishing.",
  },
  {
    icon: TrendingUp,
    title: "Adaptive Difficulty",
    description:
      "Quizzes start easy and get harder based on student performance. Every student gets the right challenge.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Cheating Suite",
    description:
      "Question shuffle, option shuffle, tab detection, fullscreen lock, and response-time monitoring.",
  },
  {
    icon: Award,
    title: "Auto Certificates",
    description:
      "PDF certificates generated automatically when students pass. Add your academy's branding.",
  },
  {
    icon: Building2,
    title: "Multi-Academy Isolation",
    description:
      "Each academy's data is completely separate. Your students, your quizzes, your analytics — nobody else's.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "See who's excelling, who's struggling, which questions are too hard, and track progress over time.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-background px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-fg">
            Everything Your Academy Needs
          </h2>
          <p className="mt-2 text-fg-secondary">
            Built for tutors, coaching centers, and training academies
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-shadow hover:shadow-md">
              <div className="flex size-12 items-center justify-center rounded-lg bg-secondary-faint">
                <feature.icon className="size-6 text-secondary" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-fg">{feature.title}</h3>
              <p className="mt-2 text-sm text-fg-secondary">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
