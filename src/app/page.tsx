import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { PricingSection } from "@/components/landing/PricingSection";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Quizo — AI-Powered Adaptive Quiz Platform for Academies",
  description:
    "Create adaptive quizzes in seconds with AI. Anti-cheating built in. Free for up to 3 courses and 25 students. Perfect for tutors, coaching centers, and training academies.",
  openGraph: {
    title: "Quizo — Create Adaptive Quizzes in Seconds",
    description:
      "AI generates quizzes that adapt to each student's level. Anti-cheat built in. Free forever.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Logged-in users land on their own dashboard, not the marketing page.
// Everyone else — including a first-time visitor — sees the landing page.
export default async function HomePage() {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    const role = currentUser.profile.role;
    redirect(role === "admin" || role === "sub_admin" ? "/dashboard" : "/student");
  }

  return (
    <div className="flex min-h-full flex-col">
      <LandingNav />
      <main>
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <HowItWorks />
        <FeaturesGrid />
        <ProductShowcase />
        <PricingSection />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
