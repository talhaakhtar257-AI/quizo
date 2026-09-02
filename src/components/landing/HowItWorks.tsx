import { BookOpen, Sparkles, Trophy } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: BookOpen,
    title: "Create Your Course",
    description:
      "Add your course, set an invite code, and share it with your students. They sign up and you approve.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Generates Your Quiz",
    description:
      "Type a topic, pick the question count, and AI creates adaptive quizzes with easy, medium, and hard questions.",
  },
  {
    number: "03",
    icon: Trophy,
    title: "Students Take & You Track",
    description:
      "Students take quizzes on any device. You get real-time scores, analytics, and automatic certificates.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface-raised px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-semibold text-fg">
          Up and Running in 3 Steps
        </h2>

        <div className="relative mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
          <div
            className="absolute top-10 right-[16.6%] left-[16.6%] hidden border-t-2 border-dashed border-border md:block"
            aria-hidden="true"
          />
          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-border bg-surface">
                <step.icon className="size-8 text-secondary" aria-hidden="true" />
              </div>
              <div className="mt-4 text-sm font-bold text-secondary">{step.number}</div>
              <h3 className="mt-1 text-lg font-semibold text-fg">{step.title}</h3>
              <p className="mt-2 text-sm text-fg-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
