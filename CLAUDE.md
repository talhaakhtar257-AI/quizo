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

---

## What this project is

An **adaptive quiz platform**. An admin uploads study material; Gemini turns it into scenario-based questions at three difficulty levels; students take quizzes where the difficulty moves up or down after every answer.

**Two sides:** admin (create, review, assign, report) and student (take quiz, see results, get certificate).

**Constraint that governs every decision: everything must be free.** No paid API, no paid tier, no credit card. If a solution requires payment, propose a free alternative instead and tell me the trade-off.

---

## Tech stack — do not substitute without asking

| Layer | Tool |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL) |
| AI generation | Google Gemini (`gemini-2.0-flash`) |
| OCR | Tesseract.js — **browser-side only** |
| Email | Resend |
| Charts | Recharts |
| PDF | jsPDF |
| Excel | SheetJS (`xlsx`) |
| Theme | next-themes |
| Icons | lucide-react |
| Hosting | Vercel |

---

## Non-negotiable rules

### Security — never break these

1. **`is_correct` never reaches the browser before submission.** Strip it server-side from every question response.
2. **The server owns the clock.** Never trust a timer value sent from the browser. It is a hint only.
3. **Question selection and answer checking happen server-side.** Never in the browser.
4. **Row Level Security on every table.** A student reads only their own rows.
5. **A student must never reach an admin route**, even by typing the URL. Enforce in middleware.
6. **A submitted attempt is immutable.** No edits, no re-submission.
7. **Secrets live only in environment variables.** Never in code, never committed.

### Product rules

8. Every question is worth **1 mark**. No difficulty weighting.
9. Passing percentage is set **per quiz**, not globally.
10. New signups start as `pending`. Only an admin approval makes them `active`.
11. AI-generated questions start `is_approved = false`. Only approved questions appear in a real quiz.
12. Manually written questions are approved on creation (a human wrote them).
13. A quiz cannot be published without enough approved questions per required level.
14. Certificates are issued **only** on pass, automatically, at submission.

---

## The adaptive engine — the core logic

Start every attempt at **Easy**.

```
correct  →  easy → medium → hard → hard (ceiling)
wrong    →  hard → medium → easy → easy (floor)
```

- Applies **within a single attempt only**. Never across quizzes.
- If `difficulty_mode` is `easy_only` / `medium_only` / `hard_only`, the level **never changes**.
- Quiz is a **pool**, not a fixed list. Admin asks for N → generate 3N (N easy + N medium + N hard). Student sees N, chosen live.
- Never repeat a question inside one attempt.
- **Pool exhaustion fallback:** Easy→Medium, Hard→Medium, Medium→Easy then Hard. If nothing remains, submit early and explain why.
- Record `difficulty_at_time` on every answer — reporting depends on it.

---

## Database — 11 tables

| Table | Holds | Critical fields |
|---|---|---|
| `profiles` | People | `role` (admin/user), `status` (pending/active/rejected) |
| `courses` | Subjects | |
| `course_outlines` | Topics in a course | `topic_order` |
| `content_uploads` | Uploaded material | `source_type` (text/image), `raw_text` |
| `quizzes` | Quiz settings | `timer_minutes`, `passing_percent`, `questions_to_show`, `difficulty_mode`, `max_attempts`, `is_published` |
| `questions` | Question pool | `difficulty`, `question_type`, `scenario_text`, `is_approved`, `generated_by_ai` |
| `options` | 4 answer choices | `is_correct` — **never sent to browser early** |
| `quiz_assignments` | Who gets which quiz | unique on (quiz_id, user_id) |
| `attempts` | Each sitting | `status`, `current_difficulty`, `time_remaining_seconds`, `percentage`, `passed` |
| `attempt_answers` | Every answer given | `is_correct`, `difficulty_at_time`, `question_order` |
| `certificates` | Issued certificates | `certificate_code` (unique) |

Full schema: `docs/SCHEMA.md`

**`attempts.time_remaining_seconds` and `attempts.current_difficulty` exist so a student can close the browser and resume exactly where they left off.**

---

## API routes — the quiz engine

| Route | Job |
|---|---|
| `POST /api/quiz/next-question` | Pick next question from `current_difficulty` pool. Strip `is_correct`. Return shuffled options. |
| `POST /api/quiz/submit-answer` | Check correctness server-side, write answer, move the ladder, update server clock. **Do not reveal correctness.** |
| `POST /api/quiz/submit` | Score, compute percentage, set pass/fail, issue certificate if passed. |
| `POST /api/quiz/heartbeat` | Every 30s. Sync `time_remaining_seconds` from server clock. |
| `POST /api/generate-questions` | Call Gemini once per difficulty level. |
| `POST /api/send-approval-email` | Resend. **Email failure must never roll back an approval.** |

---

## Design system

Full tokens: `docs/DESIGN-SYSTEM.md`. The short version:

**Light** — bg `#F8FAFC`, surface `#FFFFFF`, border `#E2E8F0`, text `#0F172A` / `#475569` / `#94A3B8`, primary `#4F46E5` (hover `#4338CA`)

**Dark** — bg `#0F172A`, surface `#1E293B`, raised `#334155`, text `#F1F5F9` / `#CBD5E1` / `#94A3B8`, primary `#818CF8`

**Semantic** — success `#16A34A`, warning `#D97706`, danger `#DC2626`, info `#2563EB`

**Rules:**
- Default theme is **system**. Zero flash on load.
- Dark mode: never pure black, never pure white text. Surfaces get **lighter** to show elevation, not darker.
- **Red is reserved** for wrong answers, failures, errors, deletes. Never decorative.
- **Difficulty is never green/yellow/red.** Use `DifficultyIndicator`: three slate `#64748B` bars (1/2/3 filled) plus the word.
- Colour is never the only signal — always pair with an icon or text.
- Spacing is always a multiple of 4px. Radius: 6px controls, 8px cards, 12px modals.
- Timer: quiet → primary → warning under 5 min → danger under 1 min. **Never flashes.**
- Minimum touch target 44px. Minimum font size 14px. Contrast ≥ 4.5:1.
- Certificate PDF is **always light-coloured**, ignoring theme — it gets printed.

**Reuse components from `src/components/ui/`. Never invent a new button or input style.**

---

## File structure

```
src/
  app/
    (auth)/        login, signup, forgot-password, reset-password, pending-approval
    (admin)/       dashboard, courses, quizzes, users, attempts, reports
    (user)/        dashboard, quizzes, history
    quiz/          instructions, attempt, result
    api/           quiz/*, generate-questions, send-approval-email
  components/
    ui/            Button Input Card Badge Modal Toast Table EmptyState
                   DifficultyIndicator LoadingSpinner Skeleton ThemeToggle
    admin/         admin-only pieces
    user/          student-only pieces
  lib/             supabase clients, getCurrentUser, helpers
  types/           database.ts
docs/              BUILD-PLAN.md  DESIGN-SYSTEM.md  SCHEMA.md
```

---

## Conventions

- Components `PascalCase.tsx`. Helpers `kebab-case.ts`. Routes lowercase.
- Server Components by default. `'use client'` only when interactivity requires it.
- Every async UI needs a loading state and an error state. No blank screens.
- Every error message is plain English with a next action. Never show a raw stack trace to a user.
- Every empty list gets an `EmptyState`, never a bare blank area.
- Aggregate in SQL, not in the browser.

---

## Definition of done

A task is not finished until:

- [ ] It works on desktop **and** on a phone screen
- [ ] It works in **both** light and dark theme
- [ ] Loading, empty and error states all exist
- [ ] Keyboard navigation works, focus ring is visible
- [ ] Security rules above are not violated
- [ ] `npm run build` passes with no errors
- [ ] I have tested it and confirmed

---

## Current status

Build order and progress: **`docs/BUILD-PLAN.md`** — read it before starting work, tick items off as you finish.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
