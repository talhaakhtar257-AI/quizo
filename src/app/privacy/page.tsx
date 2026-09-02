import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Quizo collects, stores, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <LandingNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 md:px-8">
        <h1 className="text-3xl font-bold text-fg md:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-fg-secondary">Last updated: {LAST_UPDATED}</p>

        <div className="prose-body mt-8 space-y-8 text-fg-secondary [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          <section>
            <p>
              Quizo ("we", "us") is a quiz platform used by academies ("customers") to teach and
              test their own students. This page explains what we collect, why, and how it&apos;s
              protected. It&apos;s written in plain English on purpose — if anything here is
              unclear, contact us at the address below.
            </p>
          </section>

          <section>
            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Account information</strong> — name and email address, for academy owners,
                sub-admins, and students.
              </li>
              <li>
                <strong>Academy content</strong> — course material an academy uploads to generate
                quizzes from, the quizzes and questions themselves, and each academy&apos;s own
                branding (logo, name, color).
              </li>
              <li>
                <strong>Quiz activity</strong> — attempts, answers, scores, and timing, so students
                can see their history and academies can see their students&apos; results.
              </li>
              <li>
                <strong>Anti-cheating signals</strong> (Pro and Institution academies only) — tab
                switches, fullscreen exits, and similarly-timed answers during a quiz attempt, used
                only to flag attempts for the academy&apos;s own review.
              </li>
              <li>
                <strong>Basic technical data</strong> — the kind any web server logs (IP address,
                browser type, timestamps), used for security and debugging, not for advertising.
              </li>
            </ul>
          </section>

          <section>
            <h2>Every academy&apos;s data is isolated</h2>
            <p>
              Quizo is multi-tenant: many academies share the same platform, but each academy&apos;s
              courses, students, quizzes, and results are walled off from every other academy at
              the database level. No academy can see another academy&apos;s data, and no student can
              see another student&apos;s answers or another academy&apos;s content.
            </p>
          </section>

          <section>
            <h2>Who else sees this data</h2>
            <p>We don&apos;t sell data. A small number of service providers process it to run Quizo:</p>
            <ul>
              <li>
                <strong>Supabase</strong> — hosts our database, authentication, and file storage.
              </li>
              <li>
                <strong>Google Gemini</strong> — generates quiz questions from an academy&apos;s
                uploaded material. On the Free plan, each academy connects its own Gemini API key,
                so its content reaches Google under that academy&apos;s own account. On paid plans
                AI is included, so the material is sent to Google under Quizo&apos;s account
                instead. A paid academy that prefers the former can still connect its own key in
                Settings, and we will use it.
              </li>
              <li>
                <strong>Resend</strong> — delivers transactional email (enrollment approvals, invite
                emails). It only ever sends the specific email it&apos;s asked to send.
              </li>
              <li>
                <strong>Vercel</strong> — hosts the application itself.
              </li>
            </ul>
          </section>

          <section id="cookies">
            <h2>Cookies</h2>
            <p>
              Quizo uses only the cookies needed to keep you signed in and to remember your
              light/dark theme choice. We don&apos;t use advertising or cross-site tracking cookies.
            </p>
          </section>

          <section>
            <h2>How long we keep data</h2>
            <p>
              Data is kept for as long as an academy&apos;s account is active, so students can see
              their own history and academies can see their own records. An academy owner can
              request deletion of their academy&apos;s data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can ask to see, correct, or delete the personal data we hold about you at any
              time by contacting us at the address below. A student&apos;s enrollment status and
              quiz history belong to the academy they&apos;re enrolled in — requests affecting an
              academy&apos;s own records are handled through that academy&apos;s owner.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions about this policy? Contact us at{" "}
              <a href="mailto:privacy@example.com" className="text-secondary underline">
                privacy@example.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const LAST_UPDATED = "August 2026";
