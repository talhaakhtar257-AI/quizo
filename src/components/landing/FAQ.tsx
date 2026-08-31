import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui";

const faqs = [
  {
    q: "Is Quizo really free?",
    a: "Yes — the Free plan gives you 3 courses with up to 25 students each, forever. No credit card needed. No trial period. When you outgrow Free, upgrade to Pro.",
  },
  {
    q: "How does the AI generate questions?",
    a: 'You provide a topic (like "JavaScript variables" or "Cell biology chapter 5"). Our AI creates multiple-choice questions at three difficulty levels — easy, medium, and hard. You review and edit every question before students see them.',
  },
  {
    q: "Do I need my own AI API key?",
    a: "Only on the Free plan, where you connect your own free Google Gemini key — we walk you through it in about two minutes. Pro and Institution include AI, so there's nothing to set up: sign up and start generating.",
  },
  {
    q: "Can students cheat?",
    a: "Quizo makes cheating very hard. Questions and answer options are shuffled every attempt, so no two screens look the same. Pro adds tab-switch detection, fullscreen lock, and response-time monitoring. Even if a student screenshots their quiz, the next attempt has different questions in a different order.",
  },
  {
    q: "Is student data safe?",
    a: "Every academy's data is completely isolated using Row Level Security in our database. Academy A can never see Academy B's students, quizzes, or results. We're hosted on Supabase (built on PostgreSQL) with encryption at rest.",
  },
  {
    q: "What if I need more than 25 students?",
    a: "Upgrade to Pro for 100 students per course, or Institution for 500. Your data carries over — nothing is lost.",
  },
  {
    q: "Can I use my own branding?",
    a: 'On Pro, you can remove the "Powered by Quizo" badge and add your academy logo to certificates. On Institution, everything is fully white-labeled — students see your brand, not ours.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-background px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-semibold text-fg">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.q} value={`item-${index}`}>
              <AccordionTrigger className="text-base text-fg">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-fg-secondary">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
