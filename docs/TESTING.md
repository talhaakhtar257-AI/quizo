# Testing

Everything here is free and development-only. None of it ships to Vercel or costs anything to run.

## The commands

| Command | What it does | How long |
|---|---|---|
| `npm test` | Unit tests + database security tests | ~20 seconds |
| `npm run test:e2e` | Real browser, real quiz taken end to end | ~5 minutes (builds the app first) |
| `npm run typecheck` | Catches type mistakes without building | ~30 seconds |
| `npm run build` | The same build Vercel runs | ~1 minute |

`npm test` and `npm run test:e2e` both read `.env.local`. The database tests skip themselves
automatically when the Supabase keys are missing, so nothing breaks on a machine that has not been
set up.

## What is covered, and why

**Unit tests** (`tests/unit/`) — the pure logic, where a silent break would still look like a
working app:

- `quiz-engine` — the adaptive ladder (easy → medium → hard, and back down), the ceiling and floor,
  locked single-level modes, the pool-exhaustion fallback order, the publish gate, and the
  server-side clock.
- `anti-cheat` — the per-violation weights, the flag threshold, and the fact that the ordinary
  `quiz_started` / `quiz_submitted` events are never counted as cheating.
- `plan-limits` — the `PLAN_LIMIT:` prefix that tells a form to show the upgrade card instead of a
  red error.
- `invite-code` — the format, the excluded look-alike characters (0/O, 1/I/L), and collisions.
- `crypto` — encrypting and decrypting an academy's Gemini key. If these two ever disagreed, every
  saved key would become unreadable and there is no plaintext copy anywhere.
- `api-contract` — reads the student API route files and fails if a response ever mentions
  `correct_option` or `is_correct`. That is the answer key, and it must never reach a browser
  before submission.

**Database security tests** (`tests/integration/rls.test.ts`) — the most important tests in the
project. They create two throwaway academies against the real Supabase project, sign in as real
users, and ask the database directly for things those users must not have:

- One academy cannot read, edit, delete, or plant rows in another academy — courses, students,
  enrollments, the organization row, or the saved API key.
- A student cannot read the question bank, list other students, promote themselves to admin, move
  themselves to another academy, approve their own enrollment, or write a quiz attempt (which is
  how a score would be forged).
- An academy owner cannot upgrade their own plan for free or lift their own suspension — but can
  still rename their academy, so the guards did not make the row read-only by mistake.

Every academy these tests make is named `zztest…` and is deleted afterwards. Cleanup goes through a
database function that refuses any academy whose name does not start with `zztest`, so a real
academy can never be removed by a test.

**Browser journeys** (`tests/e2e/`) — Playwright drives a real Chrome against a real production
build:

- A student takes a quiz, the difficulty climbs as they answer correctly and drops when they answer
  wrong, they pass, and a certificate is issued automatically.
- A quiz with too few questions submits early and scores only what was actually asked.
- An attempt whose time ran out is closed by the server — the browser's clock is never trusted.
- A submitted attempt cannot be reopened by going back to its URL.
- A signed-out visitor, a student, and an academy owner are each stopped at the routes they are not
  allowed into.
- A student still waiting for approval cannot start a quiz, and an approved one can.
- Accessibility: every public page is scanned with axe for serious and critical violations, and the
  first Tab press must land somewhere with a visible focus ring.

**Signed-in accessibility** (`tests/e2e/signed-in-accessibility.spec.ts`) — the pages people
actually spend the day in: seven admin pages and three student pages, each scanned **twice, once in
each theme**. The dark colours had never been checked by anyone, and three of them turned out to
fail the project's own 4.5:1 rule.

**Phone screens** (`tests/e2e/responsive.spec.ts`) — every page is loaded at 375px wide and must not
scroll sideways. A wide table is allowed to scroll inside its own box; the page itself is not. The
quiz screen is also checked for 44px-tall answer buttons, because that is where a mis-tap costs a
student a mark.

**The AI prompt** (`tests/unit/prompt.test.ts`) — uploaded material is untrusted text that goes
straight into the prompt. These check it cannot break out of its quotes and issue its own
instructions, and that a malformed answer from Gemini is rejected rather than turned into a
broken question.

**Codes that act as keys** (`tests/unit/random-code.test.ts`) — invite codes and certificate numbers
must be unguessable, evenly spread, and free of the characters people misread.

## What is deliberately not tested

- **Billing** — there is no payment system yet, so there is nothing to test.
- **Load and stress at volume** — the only database is also the live one. Hammering it would take
  the real site down.
- **AI answer quality** — checked by hand against real material, not by an automated test, because
  scoring "is this a good question?" needs a person.

## Continuous integration

`.github/workflows/ci.yml` runs the types, the linter, the unit and database tests, the build, and
the browser journeys on every push and pull request. For the database and browser tests to run
there, these repository secrets must exist: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`. Without them those
tests skip themselves and the rest still runs.

## A note on speed

The browser tests run against the real Supabase free tier, which is also the live database. It is
not fast, and it gets slower as the suite goes on. The waits in `playwright.config.ts` are
deliberately generous for that reason — a page that takes forty seconds to answer means a database
under load, not a broken product. If the whole suite starts failing on timeouts, check the Supabase
dashboard before looking at the code.
