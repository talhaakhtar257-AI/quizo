import { PricingCards } from "./PricingCards";

export function PricingSection() {
  return (
    <section id="pricing" className="bg-background px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-fg">Simple, Transparent Pricing</h2>
          <p className="mt-2 text-fg-secondary">
            Start free. Upgrade when you&apos;re ready. No surprises.
          </p>
        </div>

        <div className="mt-12">
          <PricingCards />
        </div>

        <p className="mt-8 text-center text-sm text-fg-secondary">
          No credit card required · Cancel anytime · 14-day money back guarantee
        </p>
      </div>
    </section>
  );
}
