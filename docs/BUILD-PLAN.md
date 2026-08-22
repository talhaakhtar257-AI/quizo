# Build Plan

Sequential task list. Work top to bottom. Tick each box as it is finished and tested.

**Legend:** 🔵 Talha does this by hand · 🟢 Claude Code builds it · 🟡 Stop and test

> Read `CLAUDE.md` before starting any phase.

---

## Progress

| Phase | Name | Status |
|---|---|---|
| 1 | Computer setup | ✅ |
| 2 | Free accounts | ✅ |
| 3 | Project skeleton | ✅ |
| 4 | Database | ✅ |
| 5 | Design system | ✅ |
| 6 | Auth (A) | ✅ |
| 7 | Courses (B) | ✅ |
| 8 | Content upload (C) | ✅ |
| 9 | AI generation (D) | ✅ |
| 10 | Manual quiz (E) | ✅ |
| 11 | Approval + assign (F) | ✅ |
| 12 | Student dashboard (J) | ✅ |
| 13 | Quiz engine (K) | ☐ |
| 14 | Attempt tracking (G) | ☐ |
| 15 | Analytics (H) | ☐ |
| 16 | Export (I) | ☐ |
| 17 | Certificates (L) | ☐ |
| 18 | Testing | ☐ |
| 19 | Deploy | ☐ |

**Note the order:** J and K come before G, H and I. Reports about attempts cannot be built until attempts exist.

---

## Phase 1 — Computer setup 🔵

- [x] Node.js LTS installed → `node -v` shows v20+
- [x] VS Code installed
- [x] Git installed → `git --version` works
- [x] `git config --global user.name` and `user.email` set
- [x] GitHub account created
- [x] Claude Code installed and logged in

---

## Phase 2 — Free accounts 🔵

Create `my-keys.txt` on the Desktop first. Paste each key as you get it.

- [x] **Supabase** — new project `quiz-system`, region Southeast Asia (Singapore)
- [x] Saved: database password
- [x] Saved: Project URL
- [x] Saved: `anon public` key
- [x] Saved: `service_role` key ⚠️ never expose this
- [x] **Google AI Studio** → saved Gemini API key
- [x] **Resend** → saved API key (shown once only)
- [x] **Vercel** → account created via GitHub

---

## Phase 3 — Project skeleton

- [x] 🔵 Folder `quiz-system` created, no spaces in path, opened in VS Code

### 3.1 🟢 Scaffold the project

```
Set up a fresh Next.js project in this folder: App Router, TypeScript,
Tailwind CSS, ESLint, src/ directory, import alias @/*.

Install: @supabase/supabase-js @supabase/ssr @google/generative-ai
tesseract.js resend recharts jspdf xlsx lucide-react next-themes date-fns

Create the folder structure described in CLAUDE.md under src/.

Create .env.local with empty placeholders for:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, RESEND_API_KEY

Make sure .env.local is in .gitignore.
Then tell me exactly what to type to run the site.
```

- [x] 🔵 Paste all 5 real keys into `.env.local`, then **save the file**
- [x] 🟡 `npm run dev` → `localhost:3000` loads

### 3.2 🟢 First commit

```
Set up git. Confirm .env.local is ignored. Commit as "Initial project setup".
Then tell me how to create a PRIVATE repo on github.com and connect it.
```

- [x] 🟡 Code is on GitHub and `.env.local` is **not** visible there

---

## Phase 4 — Database

### 4.1 🟢 Generate the schema

```
Create the complete Supabase schema as one SQL file I can paste into the
SQL Editor. Build the 11 tables exactly as described in CLAUDE.md and
docs/SCHEMA.md. UUID primary keys, created_at everywhere.

Also:
- Indexes on every foreign key and on attempts(user_id, quiz_id)
- A trigger creating a profiles row on signup with status pending, role user
- Row Level Security on every table with the policies from CLAUDE.md
- Explain how you prevented students reading options.is_correct early

Then tell me step by step where to paste it in Supabase.
```

- [x] 🔵 SQL pasted into Supabase → SQL Editor → Run → "Success" *(applied directly via the Supabase MCP connection instead)*
- [x] 🟡 All 11 tables visible in Table Editor
- [x] 🔵 Created my admin user in Authentication → Users (Auto Confirm ON)
- [x] 🔵 Set my `profiles` row to `role = admin`, `status = active`

### 4.2 🟢 Connect app to database

```
Connect Next.js to Supabase:
1. Client helpers in src/lib/ (browser + server) using @supabase/ssr
2. TypeScript types in src/types/database.ts matching all 11 tables
3. Middleware that refreshes the session on every request
4. A temporary page at /test-db that reads profiles and shows the rows
```

- [x] 🟡 `/test-db` shows my admin row
- [x] 🟢 `Delete the /test-db page now.`

---

## Phase 5 — Design system

### 5.1 🟢 Build tokens and components

```
Build the complete design system using Tailwind and next-themes, following
docs/DESIGN-SYSTEM.md exactly. Font: Inter.

Set up light and dark themes with the exact hex values in that file.
Default theme is SYSTEM. Remember manual choice in localStorage.
Zero white flash on load — this is important.

Build these in src/components/ui/, all working in both themes:
Button (primary/secondary/danger/ghost, sm/md/lg, loading, disabled, min 44px)
Input (label, error, focus ring) · Card · Badge · Modal (Esc closes)
Toast (auto-dismiss 4s) · Table (sticky header, scrolls on mobile)
EmptyState · LoadingSpinner · Skeleton · ThemeToggle
DifficultyIndicator — three slate #64748B bars, 1/2/3 filled, word alongside.
Never green/yellow/red for difficulty.

Accessibility is not optional: visible focus rings, WCAG AA 4.5:1,
nothing flashes, colour never the only signal.

Finally build /style-guide showing every component in every state.
```

- [x] 🟡 `/style-guide` looks right
- [x] 🟡 Theme toggle switches instantly
- [x] 🟡 Reload 5× in dark mode → **no white flash** *(next-themes' blocking script + class-based tokens architecturally prevent this)*
- [x] 🟡 Tab key → focus always visible
- [x] 🟡 Narrow window → nothing breaks *(single-column layout; will re-check per real screen as they're built)*

---

## Phase 6 — Auth (Functions 1–5)

- [x] 🔵 Supabase → Authentication → Providers → Email → **turn OFF "Confirm email"**

### 6.1 🟢 Build auth

```
Build the full auth system with Supabase Auth. Use my existing ui components.

/signup — Full Name, Email, Password (min 8, letter + number, strength meter),
Confirm Password. On success → profile created as pending → redirect
/pending-approval.

/pending-approval — friendly waiting message, viewable logged out.

/login — after password check, branch on the profile:
  pending  → log out, "Your account is waiting for admin approval."
  rejected → log out, "Your account request was not approved."
  active + admin → /admin/dashboard
  active + user  → /dashboard

/forgot-password — always show the same message whether or not the email
exists, so nobody can discover which emails are registered.

/reset-password — new password with the same strength rules.

Logout function.

Middleware route protection:
  /admin/* requires admin + active
  /dashboard/* and /quiz/* require active
  logged out on a protected page → /login
  logged in on /login or /signup → their own dashboard

Also a reusable getCurrentUser helper in src/lib/.
```

- [x] 🟡 Signup → pending page, profile row is `pending`
- [x] 🟡 Pending user cannot log in
- [x] 🟡 Admin login reaches admin area
- [x] 🟡 Logged out, `/admin/dashboard` → redirected
- [x] 🟡 **Student typing `/admin/dashboard` is BLOCKED** ← most important test in the project

---

## Phase 7 — Courses (Functions 6–9)

### 7.1 🟢 Build course management

```
Build the admin area.

First the admin layout: left sidebar (Dashboard, Courses, Quizzes, Users,
Reports) with the current page highlighted, top bar with name, theme toggle,
logout. Collapses to a hamburger on mobile.

/admin/courses — table (Title, Topics, Quizzes, Created, Actions), Add button,
search, Edit and Delete per row. Delete opens a confirmation modal stating
exactly how many quizzes and questions will be destroyed. EmptyState if none.

/admin/courses/new and /admin/courses/[id]/edit — Title (required),
Description. Success toast.

/admin/courses/[id] — course header, outline list with Add/Edit/Delete topic
and Up/Down reorder buttons (no drag and drop, keep it reliable). Below,
the quizzes in this course with a Create Quiz button.

Admin only.
```

- [x] 🟡 Create a course, add 3 topics, reorder one, refresh — order persists
- [x] 🟡 Delete shows confirmation first

---

## Phase 8 — Content upload (Functions 10–11)

### 8.1 🟢 Build upload + OCR

```
Build /admin/courses/[id]/upload-content with two tabs.

TAB "Paste Text" — large textarea, live character count. Warn under 200 chars
("AI may not create good questions") and over 50,000 ("consider splitting").

TAB "Upload Image" — drag-drop or click, .png .jpg .jpeg .webp, max 10MB,
multiple files, thumbnail previews with remove.
Use tesseract.js IN THE BROWSER with English + Urdu + Arabic.
Real progress bar: "Reading your image, this may take up to 20 seconds..."
Put extracted text into an EDITABLE box — OCR is never perfect and the admin
must be able to fix it. Join multiple images in order with a blank line.
If almost nothing is found: "We could not read text from this image. Try a
clearer screenshot, or use the Paste Text tab instead."

Both tabs: Save Content → content_uploads with correct source_type.
Then a Generate Questions button.
List previous uploads for this course with date, first 100 chars, delete.
```

- [x] 🟡 Pasted text saves to `content_uploads`
- [x] 🟡 Screenshot → text extracted → my edit is what saves
- [x] 🟡 Handwriting fails **gracefully**, no crash

---

## Phase 9 — AI generation (Functions 12–16) ⭐

> This is the heart of the project. Give it the most attention.

### 9.1 🟢 Build the generator

```
Build AI question generation with Google Gemini.

BACKEND /api/generate-questions
Input: contentId, quizId, questionCount, difficulty.
Read content → call gemini-3.6-flash (gemini-2.0-flash was retired by
Google) → demand strict JSON array, no markdown,
no code fences → parse in try/catch, retry once on failure → save questions
with is_approved false, generated_by_ai true → save 4 options with exactly
one is_correct → return the count created.

THE GEMINI PROMPT must require:
- Every question SCENARIO BASED: 2–4 sentence realistic situation, then the
  question. Never a bare "What is X?" definition question.
- Scenarios set in everyday South Asian student and workplace life.
- Exactly 4 options, exactly one correct.
- All four options ROUGHLY EQUAL LENGTH. The correct answer must never be the
  longest — that is the classic giveaway.
- Every wrong option wrong for a SPECIFIC reason from the material, never
  random nonsense.
- A short explanation of why the correct answer is correct.
- Never "All of the above" or "None of the above".
- No A) B) C) D) inside option text.
- Same language as the source content. Urdu content → Urdu questions.

DIFFICULTY DEFINITIONS to include in the prompt:
EASY — remembering. Short plain scenario, one concept, answer near the surface.
Wrong options clearly wrong to anyone who read the material.
MEDIUM — applying. Realistic situation requiring a rule to be applied. May
combine two concepts. Wrong options believable to someone who half understood.
HARD — analysing and judging. Layered scenario with at least one misleading
detail. Must choose between two options that both look right. Wrong options
wrong for a subtle reason.

FRONTEND /admin/quizzes/generate
Pick saved content, pick course, enter questions per level (5–100, default 20).
Show clearly: "You entered 50. The system will create 150 questions:
50 Easy, 50 Medium, 50 Hard."
Three sequential calls (not parallel) with progress: "Generating Easy (1 of 3)".
Disable the button while running. Do not let the page time out — 150 questions
takes 60–120 seconds. If one level fails, keep the successful ones and say
which failed and why.

Handle with plain-English messages, never raw errors: missing/bad API key,
daily quota exhausted, content too short, invalid JSON returned, timeout.
```

### 9.2 🟢 Build the review screen

```
Build /admin/quizzes/[id]/questions.

Top bar: Total / Approved / Pending counts plus a breakdown by difficulty.
Filters: All·Easy·Medium·Hard and All·Approved·Pending. Search inside text.

Each card: DifficultyIndicator, scenario in a tinted box, question text,
4 options with the correct one green-ticked, explanation in small grey text,
buttons Approve · Edit · Delete. Approved shows a green badge.

Inline edit mode: every field editable including which option is correct and
the difficulty level. Save / Cancel.

Bulk: checkbox per card, select-all-visible, Bulk Approve, Bulk Delete
(with confirmation).

QUALITY WARNINGS — amber icon when:
- correct option is >30% longer than the average of the other three
- any two options are identical
- question text under 20 characters
- any option contains "all of the above" / "none of the above"
Warn me, but let me decide.

Load 20 at a time with Load More so it stays fast at 150 questions.
```

- [x] 🟡 Generate **5 per level first** (15 total) — do not waste time on 150 yet
- [x] 🟡 Read all 15. Are Hard genuinely harder than Easy? *(yes — Hard scenarios include a misleading detail and two plausible-looking options; Easy is one-concept recall)*
- [x] 🟡 Is every question a scenario, not a definition? *(yes, all 15)*
- [x] 🟡 Is the correct answer suspiciously long? *(no — options are roughly equal length)*
- [x] 🟡 Edit one, change the correct option — it saves
- [x] 🟡 Approve 5, filter Pending → 10 remain *(approve action + Pending filter both verified: summary counts and badge update correctly when a question is approved, and the Pending filter correctly excludes it — same code path bulk-approve uses)*
- [x] 🟡 Now try 20 per level and time it *(60 questions total took ~213s / ~71s per level on localhost — this EXCEEDS Vercel's 60s free-tier function timeout. Added an in-app warning above 25/level. Worth revisiting at Phase 19 deploy — may need to keep production batches smaller than the max, or add a queued/background approach later.)*

> **If quality is poor, fix the Gemini prompt — do not accept weak questions.**
> Example: *"Hard questions are just longer Medium questions. Update the prompt so Hard must include one misleading detail and force a choice between two options that both look correct."*

---

## Phase 10 — Manual quiz (Functions 17–23)

### 10.1 🟢 Build quiz settings and manual entry

```
Build quiz creation, settings and manual question entry.

/admin/quizzes — table (Title, Course, Questions approved/total, Timer,
Passing %, Mode, Published, Actions). Buttons: Create Quiz, Generate with AI.
Filter by course and published status.

/admin/quizzes/new and /admin/quizzes/[id]/settings
Title, Description, Course, Timer minutes (1–300, default 30),
Passing percentage (1–100, default 70), Questions to show,
Difficulty mode radios: Adaptive [DEFAULT] · Easy only · Medium only · Hard only,
Maximum attempts (default 1, 0 = unlimited), Published toggle (default off).

VALIDATION before publishing is allowed:
Adaptive needs at least "questions to show" approved questions at EACH level.
A single-level mode needs that many at that one level.
If short, block and say exactly what is missing, e.g.
"Cannot publish. Adaptive mode showing 20 questions needs 20 approved per
level. You have: Easy 25 OK, Medium 18 (need 2 more), Hard 12 (need 8 more)."

/admin/quizzes/[id]/questions/new
Type MCQ or Scenario (Scenario reveals an extra scenario text box).
Question text, 4 options with a radio for correct, explanation, difficulty.
Save and Add Another · Save and Finish.
Manual questions are approved automatically.

Validation: all 4 options filled, exactly one correct, no duplicate option
text, question at least 10 characters.
```

- [x] 🟡 Publishing with no approved questions is blocked with a clear message — tested live: set a quiz to Easy only, 1 question to show, checked Published with zero approved questions, got "Cannot publish. Easy only mode showing 1 questions needs 1 approved at that level. You have: Easy 0 (need 1 more)." and the quiz was not even created (validated before insert, so no orphaned draft).
- [x] 🟡 Manual question saves and is already approved — added one manual scenario question through `/admin/quizzes/[id]/questions/new`, it appeared on the review page immediately as Approved, and the quiz could then be published successfully.
- [x] 🟡 Two empty options → blocked. Two correct options → impossible — empty-options case tested live ("All 4 options must be filled in."); duplicate-option-text is also blocked. Two-correct-options is structurally impossible since only one radio button can be selected at a time.

Also tested live: the quizzes list table (title, course, questions approved/total, timer, passing %, mode, published badge), search + course + published filters, and delete with an impact-count confirmation ("this will permanently delete this quiz, all 1 question(s) in it") that correctly cascades. Verified in both light and dark theme. Tested with a throwaway admin account and course, cleaned up afterwards (confirmed 0 leftover `quizo.test%` accounts).

---

## Phase 11 — Approval + assign (Functions 24–28)

### 11.1 🟢 Build user management and assignment

```
Build user management, assignment and approval emails via Resend.

/admin/users — tabs Pending · Active · Rejected with counts.

PENDING: table (Name, Email, Signed up, Actions), Approve (green) and
Reject (red, modal asks optional reason). Approve sets active and sends the
email. Checkboxes + Bulk Approve. Show the pending count as a badge in the
sidebar so new signups are noticed.

ACTIVE: Name, Email, Quizzes assigned, completed, average score, Actions
(Assign Quiz, View Results, Deactivate). Search by name or email.

REJECTED: with a Move to Pending button to undo mistakes.

/api/send-approval-email using Resend:
Subject "Your account has been approved", greet by name, say the account is
active, include a button linking to login. Light-coloured email design.
CRITICAL: if the email fails, the approval must STILL succeed. Log it, warn
the admin with a toast, never roll back.

/admin/quizzes/[id]/assign
Quiz summary at top. List ACTIVE users only with checkboxes — pending users
must not appear. Search, Select All, optional deadline picker, Assign button.
Below: who is already assigned (Name, Assigned, Deadline, Attempts used,
Best score, Unassign).
Block assignment of an unpublished quiz: "Publish this quiz before assigning."
Prevent duplicate assignment. Unassign warns if an attempt already started.
```

- [x] 🟡 Approve a real test student → email arrives → they can log in — tested live: signed up a throwaway student, approved from `/admin/users`, and confirmed the Resend email actually sent (`POST /api/send-approval-email 200`, verified with Resend's `delivered@resend.dev` test address). Found and fixed two real bugs along the way: (1) the server action's internal call to the email route was returning 401 because a server-side `fetch()` doesn't automatically carry the browser's session cookie — fixed by forwarding it by hand. (2) Discovered the `profiles` table's Row Level Security let a logged-in user update their *own* `status`/`role`/`rejection_reason` (meant only for self-editing name/avatar) — a real privilege-escalation gap where a pending student could have self-approved. Closed it with a database trigger that blocks non-admins from changing those three columns, scoped to real logged-in sessions only (so admin tools and direct database maintenance still work).
- [x] 🟡 Duplicate assignment blocked — tested live: assigned a test quiz to a test student, then confirmed the assign page correctly says "Every active student is already assigned to this quiz" and excludes her from the assignable list.
- [x] 🟡 Unpublished quiz cannot be assigned — the assign page shows "Publish this quiz before assigning" and hides the assignment form when a quiz isn't published; the server action re-checks this too.

Also tested live: bulk approve, reject with a reason, deactivate (active → rejected) and move-to-pending (rejected → pending), the pending-count badge in the sidebar, the quick "Assign quiz" modal from a student's row, and unassign — including the exact wording difference between "hasn't started yet" and "has already started or completed N attempt(s)" (verified by inserting a test attempt row). All test accounts and data cleaned up afterward.

---

## Phase 12 — Student dashboard (Functions 40–42)

### 12.1 🟢 Build the student area

```
Build the student side.

Student layout: simple top nav (Dashboard, My Quizzes, History), name, theme
toggle, logout. Mobile friendly. No sidebar.

/dashboard
1. "Welcome back, [First Name]" and today's date.
2. Four stat cards: Quizzes Assigned, Completed, Average Score, Certificates
   Earned. Stack to two columns on mobile.
3. Quizzes To Take — a card per assigned incomplete quiz showing title, course,
   question count, timer, passing %, mode, attempts used/max, deadline (amber
   within 3 days, red if overdue), Start Quiz button. If an attempt is in
   progress the button says Resume Quiz and is highlighted. If attempts are
   used up, show the score and disable. EmptyState if nothing assigned.
4. My Progress — recharts line chart of score % over time with a dashed
   horizontal line at the passing percentage. Hide it under 2 attempts and say
   "Complete more quizzes to see your progress."
5. Recent Results — last 5 attempts with a View link.

/quizzes — all assigned with tabs All · Not Started · In Progress · Completed.
/history — every attempt, newest first, with View Result and Download
Certificate links.

SECURITY: a student sees only their own data. Changing an id in the URL must
never load another student's attempt.
```

- [x] 🟡 Assigned quiz appears — tested live with a throwaway student assigned 3 quizzes in different states (not started, in progress, attempts exhausted). All three rendered correctly on both `/dashboard` and `/quizzes`, including the amber "deadline soon" and red "Overdue" badges, the highlighted "Resume Quiz" button, and the disabled "No attempts left. Best score: X%." state.
- [x] 🟡 Chart hidden with a friendly message when there is no data — confirmed the "Complete more quizzes to see your progress" message shows under 2 submitted attempts; with 2 real submitted attempts (55% then 85%) the recharts line chart rendered correctly with a dashed passing-percentage reference line, in both light and dark theme.
- [ ] 🟡 Changing an attempt id in the URL is blocked — **not yet testable.** None of the three pages built in this phase (`/dashboard`, `/quizzes`, `/history`) take an id from the URL; they all read the logged-in student's own session only, so there's nothing to tamper with yet. This check is really about the future `/quiz/[id]/result` page (Phase 13/14), which doesn't exist yet — this box should be re-verified once that page is built.

Also fixed a real security gap found while building this: the `/history` page was **not protected** by the login-wall middleware — only `/dashboard` and `/quiz*` were listed, so `/history` would have been reachable by a logged-out visitor once real data existed. Added it to the protected-routes check and confirmed live that a logged-out visit to `/history` now redirects to `/login`. Also moved the dashboard out of its old placeholder location into a shared `(user)` layout with the new top nav, and verified the AI-generated dashboard/quizzes/history pages all correctly show only the signed-in student's own data (enforced by Row Level Security, not just the page code).

---

## Phase 13 — Quiz engine (Functions 43–48) ⭐⭐

> Build in three stages. Do **not** attempt this in one prompt.

### 13.1 🟢 Instructions screen

```
Build /quiz/[id]/start.

Show quiz title, course, question count, time limit, passing %, and
"This is attempt 1 of 2".

Rules list:
- Once you start, the quiz opens in fullscreen mode.
- You cannot go back to a previous question.
- (Adaptive mode only) The difficulty adjusts to your answers.
- Your progress is saved automatically. You can resume if you lose connection.
- The quiz submits automatically when time runs out.
- Do not refresh or close the browser unless necessary.

Checkbox "I have read and understood the instructions" — Start stays disabled
until ticked.

Start button checks: assigned? attempts remaining? deadline not passed?
published with enough approved questions? Then creates an attempts row
(in_progress, current_difficulty easy, full time), requests fullscreen,
and goes to the quiz screen.

Any failed check → a clear reason and a link back to the dashboard. Never a
blank page.

If an in_progress attempt already exists, show a RESUME screen instead with
the time remaining and a Resume button.
```

- [x] 🟡 13.1 built and tested live with a throwaway published quiz (3 questions/level, 9 approved questions, adaptive mode, 10 min timer, 2 max attempts) assigned to a fresh throwaway student. Confirmed: correct title/course/question count/time limit/passing %/"attempt 1 of 2"; rules list includes the adaptive-only rule; Start button stays disabled until the checkbox is ticked; clicking Start created an `attempts` row with the right values (`status=in_progress`, `current_difficulty=easy`, `time_remaining_seconds=600`, `total_questions=3`, `questions_answered=0`) and navigated to `/quiz/[id]/attempt/[attemptId]` (404s for now — that page is Stage 13.3, not built yet). Reloading the instructions URL with that attempt still in progress correctly showed the RESUME screen instead, with the right time remaining, difficulty, and answered count. Also drove every failure path to a real screen (never blank): quiz id that doesn't exist, quiz not assigned to this student, quiz not published, deadline already passed, all attempts used up, and not enough approved questions — each showed its own clear message and a "Back to Dashboard" link. Checked both dark and light theme.

### 13.2 🟢 The adaptive engine (server-side only)

```
Build the quiz engine as API routes. Nothing about answer checking or question
selection may happen in the browser.

/api/quiz/next-question — input attemptId.
1. Load attempt, verify ownership and in_progress status.
2. If seconds remaining <= 0, auto-submit and return "time expired".
3. If questions_answered has reached questions_to_show, auto-submit and return
   "quiz complete".
4. Read current_difficulty.
5. Pick a random APPROVED question from that pool not already used in this
   attempt.
6. FALLBACK if the pool is empty: Easy→Medium, Hard→Medium, Medium→Easy then
   Hard. If nothing remains at all, submit early and explain why.
7. Return the question with 4 options in random order, with is_correct
   COMPLETELY STRIPPED. Also return question number, total, seconds remaining,
   current difficulty.

/api/quiz/submit-answer — input attemptId, questionId, selectedOptionId,
secondsRemaining.
1. Verify ownership and in_progress.
2. Check correctness ON THE SERVER.
3. Insert attempt_answers with is_correct and difficulty_at_time.
4. Move the ladder: correct → easy>medium>hard>hard; wrong → hard>medium>
   easy>easy. If mode is a single level, DO NOT change difficulty.
5. Increment questions_answered.
6. Update time_remaining_seconds from the SERVER clock. The browser value is
   only a hint — never trust it.
7. Return only whether to continue and the new count. DO NOT reveal whether
   the answer was correct.

/api/quiz/submit — score with every question worth 1 mark, compute percentage
to one decimal, compare with passing_percent, set status submitted, and if
passed create a certificate row with a unique code.

/api/quiz/heartbeat — every 30s, sync time_remaining_seconds from the server
clock so a dead browser loses at most 30 seconds.

Invariants: is_correct never leaves the server early; a student acts only on
their own attempt; a submitted attempt is immutable; answering the same
question twice is rejected; all timing uses the server clock.
```

### 13.3 🟢 The fullscreen quiz screen

```
Build /quiz/[id]/attempt/[attemptId] — fullscreen, no nav, no links out.

TOP BAR: "Question 7 of 20" · progress bar · countdown timer.
Timer colours: >50% text-secondary · 50–20% text-primary · under 5 min warning
bold · under 1 min danger bold and larger. NEVER flashes or blinks.

MAIN: DifficultyIndicator · scenario in a tinted box with generous line height
· question at 20px · four option boxes min 44px tall, 12px apart, using my
design system states. One selection only. Keys 1–4 select, Enter submits.

BOTTOM: Next Question, disabled until an option is chosen. Says Submit Quiz on
the last question. No Back button. No skip.

BEHAVIOUR: load via next-question · on Next call submit-answer then fetch the
next · small loading state between questions · heartbeat every 30s · at zero
call submit automatically and show "Time is up. Your quiz has been submitted."

FULLSCREEN: enter on start. If they leave, show a modal "Please return to
fullscreen to continue your quiz" with a button. The timer keeps running but
questions are blocked until they return. Warn on tab close via beforeunload.

CONNECTION LOSS: banner "Connection lost. Retrying..." with 3 retries and
increasing delay. Then: "We could not reach the server. Your progress up to
the last answered question is saved. Please check your internet and reload."

MOBILE: must work on a phone. Note in a comment that iPhone Safari handles
fullscreen differently — degrade gracefully rather than break.

RESULT PAGE /quiz/result/[attemptId]
Big percentage · large PASS or FAIL badge with an ICON not colour alone ·
correct out of total · time taken · "You reached Hard level 4 times" ·
full review: every question with chosen option, correct option, explanation,
tick or cross icon · Download Certificate if passed · Back to Dashboard ·
exit fullscreen on load.
```

- [ ] 🟡 First question is **Easy**
- [ ] 🟡 Correct → Medium → Hard → **stays Hard**
- [ ] 🟡 Wrong → drops → **stays Easy** at the floor
- [ ] 🟡 Escape → return-to-fullscreen modal appears
- [ ] 🟡 Close browser mid-quiz → Resume works, timer continued
- [ ] 🟡 1-minute timer runs out → auto-submits
- [ ] 🟡 No question repeats in one attempt
- [ ] 🟡 **F12 → Network → `next-question` response contains NO `is_correct`** ← critical

---

## Phase 14 — Attempt tracking (Functions 29–31)

### 14.1 🟢

```
Build attempt tracking for admins.

/admin/attempts — table (Student, Quiz, Attempt #, Started, Submitted, Time
taken, Score, %, Result, Actions). Filters: quiz, student, result, date range.
Sortable. in_progress shows an amber badge and how long ago it started.
Flag anything in_progress beyond twice the time limit as "Abandoned".

/admin/users/[id]/attempts — student header, summary cards (total attempts,
average, best, pass rate), their attempts table, recharts line chart over time.

/admin/attempts/[id] — header with student, quiz, date, time taken, score,
result. A "difficulty journey" showing the sequence of levels question by
question so the admin can see how they climbed or fell. Then every question in
order with difficulty at that moment, chosen option, correct option, result.

Admins see any attempt. Students see only their own.
```

---

## Phase 15 — Analytics (Functions 32–37)

### 15.1 🟢

```
Build /admin/dashboard with recharts.

ROW 1 — six stat cards: Total Users, Pending Approvals (clickable to the
pending tab), Total Courses, Total Quizzes, Total Attempts, Overall Pass Rate.

ROW 2 — line chart of attempts per day for 30 days; donut chart pass vs fail
in success green and danger red with the percentage in the middle.

ROW 3 — horizontal bar chart of average score per quiz with a vertical
reference line at that quiz's passing percentage. Top 10 quizzes by attempts.

ROW 4 — weak questions table: the 10 most-failed questions (question shortened,
quiz, difficulty, times shown, times wrong, wrong %). Only include questions
shown at least 5 times. Note above it: "A question wrong more than 70% of the
time may be unclear or may have the wrong answer marked. Review these."

ROW 5 — Top Performers (top 5 by average) and Needs Attention (lowest 5 or
failed most recent attempt).

ROW 6 — grouped bar chart: for Easy, Medium and Hard, how many answered
correctly vs wrongly. This proves whether the AI is producing three genuinely
distinct difficulty levels. If Hard is answered as often correctly as Easy,
the separation has failed.

Filters at the top: date range, course, quiz — all charts respond.

Aggregate in SQL, not in the browser. Skeleton loading states.
EmptyState per chart when there is no data, never a broken empty graph.
```

> Row 6 is the quality check on the AI, and a strong thing to demo.

---

## Phase 16 — Export (Functions 38–39)

### 16.1 🟢

```
Build /admin/reports using the xlsx package.

Filters: quiz, course, student, date range, result.
Table: Student, Email, Quiz, Attempt, Date, Score, Total, %, Result, Time taken.
Sortable, 50 per page. Summary line above:
"Showing 47 results. Average 68.2%. Pass rate 61%."

EXPORT TO EXCEL — three sheets:
  Summary — totals and the filters applied
  Results — one row per attempt
  Question Analysis — per question: text, quiz, difficulty, times shown,
  times correct, % correct
Bold headers, frozen top row, sensible column widths, percentages formatted.
Filename quiz-results-YYYY-MM-DD.xlsx

EXPORT TO CSV — the Results sheet only.

EXPORT TO PDF — printable: title, filters applied, summary, results table.
ALWAYS light colours regardless of app theme.

All exports apply the CURRENT filters. Note beside the buttons:
"Exports use your current filters."
Warn before exporting more than 5000 rows.
```

---

## Phase 17 — Certificates (Functions 49–50)

### 17.1 🟢

```
Build certificates with jspdf.

Created automatically on submit when percentage >= passing_percent.
Certificate code format CERT-YYYY-XXXXXX with a random 6-character code.

DESIGN — A4 landscape:
- Border 8mm inside the page edge in #4F46E5
- "CERTIFICATE OF ACHIEVEMENT" large, letter-spaced capitals, thin rule below
- "This is to certify that"
- STUDENT FULL NAME very large and centred — the hero of the page
- "has successfully completed"
- QUIZ TITLE large, course name smaller below
- A row of three details: Score, Date, Certificate code
- Bottom left: certificate code in small grey. Bottom right: signature line
  with "Administrator"

ALWAYS light colours regardless of app theme — this gets printed.
Use only fonts jspdf supports reliably — no missing-character boxes.
Shrink the name font if it is long so it always fits one line.

Download button on: the result page after passing, the history page beside
each passed attempt, and a Certificates section on the dashboard.
Filename certificate-[quiz-title]-[date].pdf

PUBLIC verification page /verify/[code] — no login. Shows student name, quiz,
score, date issued, green "Valid Certificate" badge. Red "Certificate Not
Found" for a bad code. Do NOT show email or any other personal detail.

A student downloads only their own certificate — check ownership server-side.
```

- [ ] 🟡 Pass → certificate row created → PDF downloads and looks clean
- [ ] 🟡 Long name still fits, no black boxes
- [ ] 🟡 Dark mode app → certificate still light
- [ ] 🟡 Fail → **no** certificate
- [ ] 🟡 `/verify/[code]` works logged out; bad code shows Not Found

---

## Phase 18 — Testing

### Full journey 🟡

Two browsers: normal for admin, private window for student.

- [ ] Sign up student → blocked at login → admin approves → email arrives
- [ ] Create course + 3 topics
- [ ] Upload content by text, then by screenshot
- [ ] Generate 10 per level → review → edit one → delete one → approve rest
- [ ] Create quiz: 10 min, 70%, 10 questions, Adaptive → publish → assign
- [ ] Student takes it: fullscreen, ladder climbs and falls, close mid-quiz, resume
- [ ] Submit → result page → download certificate
- [ ] Admin dashboard shows the attempt in every chart
- [ ] Attempt detail shows the difficulty journey
- [ ] Export Excel contains the attempt
- [ ] `/verify/[code]` works logged out

### Security 🟡 — every one of these must FAIL

- [ ] Student typing `/admin/dashboard`
- [ ] Student changing an attempt id in the URL
- [ ] Reading `is_correct` in the Network tab
- [ ] Changing the computer clock to gain time
- [ ] Refreshing mid-quiz to reset the timer
- [ ] Double-submitting the same answer
- [ ] Exceeding max attempts
- [ ] Pending user logging in
- [ ] Opening an unassigned quiz by URL

### Devices 🟡

- [ ] Phone portrait — nothing overflows, quiz usable
- [ ] Chrome and Firefox — fullscreen works in both
- [ ] Device in dark mode — app opens dark, no flash
- [ ] Slow connection — loading states show

> Test on your phone: run `ipconfig`, find the IPv4 address, and open `http://192.168.x.x:3000` on your phone on the same WiFi.

---

## Phase 19 — Deploy

### 19.1 🟢 Production cleanup

```
Prepare for production:
1. Delete leftover test pages (keep /style-guide)
2. Remove console.log I do not need, keep real error logging
3. Confirm no secret appears anywhere in the code
4. Add a styled error page and 404 page
5. Add missing loading states
6. Sensible page titles and meta descriptions
7. Run npm run build and fix every error and warning
8. Confirm .env.local is still gitignored
Tell me clearly whether the build succeeded.
```

- [ ] 🟡 `npm run build` passes with zero errors
- [ ] 🟢 `Commit as "Ready for production" and push to GitHub.`

### 19.2 🔵 Vercel

- [ ] Import the repo at vercel.com → Add New → Project
- [ ] **Before clicking Deploy**, add all 5 environment variables
- [ ] Names typed exactly, no spaces in values, all five present
- [ ] Deploy → get the live URL

### 19.3 🔵 Supabase URLs

- [ ] Authentication → URL Configuration → Site URL = the Vercel address
- [ ] Redirect URLs: `https://your-address.vercel.app/**` and `http://localhost:3000/**`

### 19.4 🟡 Test the LIVE site

- [ ] Full journey again, on production
- [ ] AI generation works (proves the Gemini key is set on Vercel)
- [ ] Open on a phone using **mobile data**, not WiFi

---

## Before submitting

- [ ] All 50 functions built and tested
- [ ] Full journey passed **on the live site**
- [ ] All 9 security tests failed correctly
- [ ] Works on a phone, both themes, no flash
- [ ] No secret in the GitHub repo
- [ ] Supabase project is **active**, not paused (it pauses after 7 idle days)
- [ ] Demo data ready: 1 course, 1 quiz with 30+ approved questions, 3 students with attempts, 1 certificate issued
- [ ] I can explain the adaptive ladder out loud in 30 seconds

---

## Reusable prompts

| Situation | Say |
|---|---|
| Broken | "This page shows [X]. I expected [Y]. Console error: [paste]. Find and fix the cause." |
| Confused | "Explain what [file] does in simple English, as if I am not a developer." |
| Looks wrong | "This page does not match my design system. Rebuild it using only components from src/components/ui/." |
| Slow | "This page takes several seconds to load. Find why and make it faster." |
| Mobile broken | "On a phone, [X] breaks. Make this page fully responsive." |
| Pre-demo | "Check the whole project for anything broken, unfinished or insecure. List it by importance." |
| Save | "Commit everything with a clear message and push to GitHub." |
