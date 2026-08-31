import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui";

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan needs no credit card and has no trial period — it's free for as long as you use it, with no expiry.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Nothing is deleted. If you go over a lower plan's limits (extra courses, extra students), those stay visible but new ones are blocked until you're back within the limit or upgrade again.",
  },
  {
    q: "Do I need my own AI API key?",
    a: "Yes — each academy uses their own free Google Gemini API key, on every plan. This is what keeps Quizo's own hosting costs at $0, and Gemini's free tier is generous enough for real use.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, any time. Upgrades apply immediately. Downgrades apply at the end of your current billing period.",
  },
  {
    q: "Is there a discount for paying yearly?",
    a: "Yes — both Pro and Institution save 17% when billed yearly instead of monthly.",
  },
];

export function PricingFAQ() {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-3xl font-semibold text-fg">Pricing Questions</h2>
      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.q} value={`pricing-faq-${index}`}>
            <AccordionTrigger className="text-base text-fg">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-fg-secondary">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
