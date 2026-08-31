import { Star } from "lucide-react";
import { Card } from "@/components/ui";

// Placeholder testimonials, called out explicitly in docs/LANDING-PAGE.md as
// "replace with real testimonials from beta testers as soon as available."
const testimonials = [
  {
    quote:
      "I used to spend 2 hours making a quiz. With Quizo, I describe the topic and it's done in 30 seconds. My students get better quizzes and I get my evenings back.",
    name: "Ahmed K.",
    role: "Private Tutor",
  },
  {
    quote:
      "The adaptive difficulty is exactly what we needed. Our advanced students aren't bored and our weaker students aren't overwhelmed. The analytics show me who needs help before they even ask.",
    name: "Sarah M.",
    role: "Academy Owner",
  },
  {
    quote:
      "We caught 3 students sharing answers on WhatsApp last semester. With Quizo's shuffling and anti-cheat, every screen is different. Problem solved.",
    name: "Faisal R.",
    role: "Coaching Center Director",
  },
];

export function Testimonials() {
  return (
    <section className="bg-surface-raised px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-3xl font-semibold text-fg">
          What Academy Owners Say
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name}>
              <div className="flex gap-0.5 text-primary" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm text-fg-secondary">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-4 text-sm font-semibold text-fg">
                {t.name}, <span className="font-normal text-fg-secondary">{t.role}</span>
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
