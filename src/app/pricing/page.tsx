import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingCards } from "@/components/landing/PricingCards";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { PricingFAQ } from "@/components/landing/PricingFAQ";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pricing — Quizo",
  description:
    "Free for up to 3 courses and 25 students. Upgrade to Pro or Institution for more students, unlimited courses, and the full anti-cheating suite.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <LandingNav />
      <main>
        <section className="bg-surface px-4 py-16 text-center md:px-8 md:py-20">
          <h1 className="text-4xl font-bold text-fg">Simple, Transparent Pricing</h1>
          <p className="mt-3 text-lg text-fg-secondary">
            Start free. Upgrade when you&apos;re ready. No surprises.
          </p>
          <div className="mx-auto mt-12 max-w-7xl">
            <PricingCards />
          </div>
          <p className="mt-8 text-sm text-fg-secondary">
            No credit card required · Cancel anytime · 14-day money back guarantee
          </p>
        </section>

        <section className="bg-background px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-semibold text-fg">
              Compare Every Feature
            </h2>
            <div className="mt-10">
              <ComparisonTable />
            </div>
          </div>
        </section>

        <section className="bg-surface-raised px-4 py-16 md:px-8 md:py-24">
          <PricingFAQ />
        </section>

        <section className="bg-[#153D2E] px-4 py-16 text-center md:px-8">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Ready to get started?
          </h2>
          <Link href="/signup" className="mt-6 inline-block">
            <Button size="lg">Start Free — No Credit Card</Button>
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
