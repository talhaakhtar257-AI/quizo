import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface Plan {
  name: string;
  price: string;
  priceNote?: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

const plans: Plan[] = [
  {
    name: "FREE",
    price: "$0",
    tagline: "For individual tutors getting started",
    features: [
      "3 courses",
      "25 students per course",
      "15 AI questions/day/course",
      "2 quiz attempts",
      "Basic anti-cheating (shuffle + tab detect)",
      "Basic certificates",
      "Email notifications",
    ],
    cta: "Start Free",
    href: "/signup",
  },
  {
    name: "PRO",
    price: "$19",
    priceNote: "/month ($190/year — save 17%)",
    tagline: "For growing academies",
    features: [
      "Unlimited courses",
      "100 students per course",
      "50 AI questions/day/course",
      "5 quiz attempts",
      "3× question pool (fresh questions each attempt)",
      "Full anti-cheating suite",
      "3 sub-admins",
      "Custom branded certificates",
      "CSV export",
      'Remove "Powered by Quizo"',
    ],
    cta: "Start Pro →",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "INSTITUTION",
    price: "$49",
    priceNote: "/month ($490/year — save 17%)",
    tagline: "For coaching centers & schools",
    features: [
      "500 students per course",
      "200 AI questions/day/course",
      "Unlimited quiz attempts",
      "10 sub-admins",
      "Full white-label (your brand everywhere)",
      "Response-time analytics",
      "Priority support (24hr)",
      "API access (coming soon)",
    ],
    cta: "Contact Us",
    href: "/signup?plan=institution",
  },
];

export function PricingCards() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative rounded-xl border bg-surface p-6",
            plan.highlighted
              ? "border-2 border-primary ring-1 ring-primary-subtle"
              : "border-border"
          )}
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">
              Most Popular
            </span>
          )}

          <p className="text-xs font-bold tracking-wider text-fg-muted">{plan.name}</p>
          <p className="mt-2">
            <span className="text-3xl font-bold text-fg">{plan.price}</span>
            {plan.priceNote && (
              <span className="text-sm text-fg-secondary"> {plan.priceNote}</span>
            )}
          </p>
          <p className="mt-1 text-sm text-fg-secondary">{plan.tagline}</p>

          <ul className="mt-6 space-y-2.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-fg">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>

          <Link href={plan.href} className="mt-8 block">
            <Button
              variant={plan.highlighted ? "primary" : "outline"}
              className="w-full"
            >
              {plan.cta}
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
