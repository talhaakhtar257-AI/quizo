# CLAUDE.md

Project context for Claude Code. Auto-loaded every session. Keep this file tight — it is in context on every message.

---

## Working with me

I am **not a developer**. English is not my first language.

- Explain in **simple English**, short sentences.
- Tell me clearly when **I** must do something by hand (install, click, copy a key) vs when you are doing it.
- Do not show me code unless I ask. Tell me what you changed and why.
- When something breaks, tell me the cause in plain words first, the fix second.
- If I use a wrong technical word, correct me to the right one.
- **On technical trade-offs, decide for me.** Pick the better option, then tell me what you chose and why in plain words. Do not hand me a multiple-choice question about architecture — I cannot judge those. Still ask me about product direction, money, deleting things, and anything that goes out to real people.

---

## What this project is

**Quizo** — a multi-tenant SaaS. Many academy owners sign up. Each gets a completely isolated space. AI turns their material into adaptive quizzes. Students take them with anti-cheating protection.

**Three sides:**
1. **Academy owner (admin)** — creates courses, generates quizzes, approves students, sees analytics
2. **Student** — joins with an invite code, takes quizzes, earns certificates
3. **Platform owner (me, Talha)** — sees every academy, sets who is Free vs Pro vs Institution

**Business model:** Free / Pro $19 / Institution $49 per month.

**Cost rule:** the platform must cost me **nothing to run**. Free tiers only — no paid API, no paid hosting. If something needs payment, propose a free alternative and tell me the trade-off. (Taking payment from customers is a separate thing and is out of scope for now.)

---

## Tech stack — do not substitute without asking

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| Styling | Tailwind CSS v4 |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| AI | Google Gemini `gemini-3.6-flash` — **BYOK**, each academy uses their own free key |
| Validation | zod |
| Email | Resend |
| Charts | Recharts |
| PDF | jsPDF |
| Excel | SheetJS (`xlsx`) |
| OCR | Tesseract.js — **browser-side only** |
| Theme | next-themes |
| Icons | lucide-react |
| Hosting | Vercel |

> `gemini-2.0-flash` and `gemini-2.5-flash` are **retired**. Use `gemini-3.6-flash`.

---

## Non-negotiable rules

### Multi-tenancy — the rule that protects the whole business

1. **Every data table has `organization_id`.** No exceptions.
2. **Isolation is enforced by RLS in the database, never by application code.** Use the `current_org()` SQL helper, which reads the org from the JWT.
3. **Academy A must never see academy B's anything.** This is the single most important test in the project.
4. **Never use the `service_role` key in client code.** Server actions and API routes only.

### Security

5. **`is_correct` never reaches the browser before submission.** Strip it server-side from every question response.
6. **The server owns the clock.** A timer value from the browser is a hint, never trusted.
7. **Question selection and answer checking happen server-side.** Never in the browser.
8. **A student must never reach an admin route**, even by typing the URL. Enforce in middleware.
9. **A submitted attempt is immutable.** No edits, no re-submission.
10. **Secrets live only in environment variables.** Each academy's Gemini key is encrypted at rest and decrypted server-side only.
11. **The platform-owner area is gated by an env allowlist**, never by a database role a customer could reach.

### Product

12. Every question is worth **1 mark**. No difficulty weighting.
13. Passing percentage is set **per quiz**.
14. AI questions start `is_approved = false`. Manual questions are approved on creation (a human wrote them).
15. A quiz cannot be published without enough approved questions per required level.
16. Certificates are issued **only** on pass, automatically, at submission.
17. Score is **best of N attempts**, not last and not average.

---

## The adaptive engine — the core logic

Start every attempt at **Easy**. The server picks each question **after** seeing the previous answer.

```
correct  →  easy → medium → hard → hard (ceiling)
wrong    →  hard → medium → easy → easy (floor)
```

- One question at a time. **No back button, no skip.** This is what makes adaptive possible — if all questions were sent up front, the difficulty would be locked before the student answered anything.
- Applies **within a single attempt only**. Never across quizzes.
- If `difficulty_mode` is a single level, the level **never changes**.
- Never repeat a question inside one attempt.
- **Pool exhaustion fallback:** Easy→Medium, Hard→Medium, Medium→Easy then Hard. If nothing remains, submit early and explain why.
- Record `difficulty_at_time` on every answer — reporting depends on it.

**Free vs Pro differ by pool size, not by player.** Free generates 1× the questions shown; Pro generates 3× so retakes draw fresh questions. Same engine for everyone.

---

## Database

19 tables, every data table carrying `organization_id`. Full schema, RLS policies and migration order: **`docs/SCHEMA.md`**.

The tables in one line each:

`organizations` · `organization_settings` · `profiles` · `sub_admin_permissions` · `courses` · `content_uploads` · `invite_codes` · `enrollments` · `quizzes` · `quiz_pools` · `pool_questions` · `quiz_attempts` · `attempt_answers` · `quiz_event_stream` · `ai_usage_log` · `certificates` · `notifications` · `email_log` · `plan_limits`

`content_uploads` is a deliberate addition beyond the original spec — see `docs/SCHEMA.md` Table 19 for why the AI generation prompt needs real source material, not a bare topic string.

---

## Design system

Full tokens: **`docs/DESIGN-SYSTEM.md`**. The short version:

**Brand** — spruce green `#1B4D3E` (primary), gold `#F4A300` (CTAs)
**Semantic** — success `#16A34A`, error `#DC2626`, warning `#F59E0B`, info `#2563EB`
**Font** — Inter

**Rules:**
- Default theme is **system**. Zero flash on load.
- **Red is reserved** for wrong answers, failures, errors, deletes. Never decorative.
- **Difficulty is never green/yellow/red.** Use `DifficultyIndicator`: three slate bars plus the word.
- Colour is never the only signal — always pair with an icon or text.
- Spacing is always a multiple of 4px.
- Timer: quiet → primary → warning under 5 min → danger under 1 min. **Never flashes.**
- Minimum touch target 44px. Minimum font 14px. Contrast ≥ 4.5:1.
- Certificate PDF is **always light-coloured**, ignoring theme — it gets printed.

**Reuse components from `src/components/ui/`.** They already carry passed accessibility work. shadcn/ui is installed only for pieces we lack (Accordion, Tabs, Select, Switch, DropdownMenu) — do not replace working components with shadcn versions. `Toast`/`useToast` already covers what Sonner would — it was dropped from the shadcn install for exactly that reason.

---

## File structure

```
src/
  app/
    (public)/      landing, pricing, login, signup, signup/student
    (dashboard)/   dashboard/ — admin: courses, students, analytics, settings
    (student)/     student/ — quizzes, results, history
    platform/      platform owner only — every academy, plan control
    quiz/          instructions, attempt, result
    api/           quiz/*, generate-questions, send-approval-email
  components/
    ui/            Button Input Card Badge Modal Toast Table EmptyState
                   DifficultyIndicator LoadingSpinner Skeleton ThemeToggle
    dashboard/     admin-only pieces
    student/       student-only pieces
    landing/       marketing pieces
  lib/             supabase clients, gemini, email, quiz-engine, helpers
  types/           database.ts
docs/              BUILD-PLAN.md SCHEMA.md DESIGN-SYSTEM.md FEATURES.md
                   API-ROUTES.md LANDING-PAGE.md  archive/
```

---

## Conventions

- Server Components by default. `'use client'` only when interactivity requires it.
- All database work in Server Actions or API routes — never from a client component.
- `zod` for every form and API input.
- Components `PascalCase.tsx`. Helpers `kebab-case.ts`. Routes lowercase.
- Every async UI needs a loading state and an error state. No blank screens.
- Every error message is plain English with a next action. Never a raw stack trace.
- Every empty list gets an `EmptyState`.
- Aggregate in SQL, not in the browser.

---

## Known limits — real, not bugs

1. **Resend free tier only emails my own verified address.** Emails to real students will fail until a domain is bought (~$10/year). Build the emails anyway, log failures to `email_log`, and **never let an email failure roll back the action it followed**.
2. **Vercel free tier kills a function at 60 seconds.** Generating 20 questions for one level measured ~71s. Keep generation chunked per level with progress, and cap per-request counts.
3. **Supabase free tier pauses after 7 days idle.** Open the dashboard and Restore before any demo.
4. **SheetJS free edition cannot write bold cells or frozen panes.** Column widths and number formats work.

---

## Definition of done

- [ ] Works on desktop **and** a phone screen
- [ ] Works in **both** light and dark theme
- [ ] Loading, empty and error states all exist
- [ ] Keyboard navigation works, focus ring visible
- [ ] **Academy A cannot see academy B's data** — tested, not assumed
- [ ] Security rules above are not violated
- [ ] `npm run build` passes clean
- [ ] Talha has tested it and confirmed

---

## Current status

Build order and progress: **`docs/BUILD-PLAN.md`** — read it before starting work, tick items off as you finish.

The previous single-academy version of this app is preserved at git tag `v1-single-academy`, with its docs in `docs/archive/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
