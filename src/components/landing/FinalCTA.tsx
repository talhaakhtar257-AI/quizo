import Link from "next/link";
import { Button } from "@/components/ui";

// The one deliberately dark section on an otherwise light landing page —
// per docs/LANDING-PAGE.md, for contrast right before the footer. Uses a
// literal spruce-800 (#153D2E), not the --secondary token: --secondary
// swaps to a LIGHT green in dark app theme (for text/border contrast
// elsewhere), which would turn this into a light section instead of the
// fixed dark-contrast band it's meant to be in both themes.
export function FinalCTA() {
  return (
    <section className="bg-[#153D2E] px-4 py-20 text-center md:px-8">
      <h2 className="text-3xl font-bold text-white md:text-4xl">
        Ready to Stop Wasting Hours on Quizzes?
      </h2>
      <p className="mt-3 text-[#B3E4D0]">
        Your first AI-generated quiz is 30 seconds away.
      </p>
      <Link href="/signup" className="mt-8 inline-block">
        <Button size="lg">Start Free — No Credit Card</Button>
      </Link>
      <p className="mt-4 text-sm text-[#7DCDB0]">
        Join 500+ academies already using Quizo
      </p>
    </section>
  );
}
