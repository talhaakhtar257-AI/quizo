# Quizo — Build Plan (Multi-Academy Rebuild)

Sequential task list. Work top to bottom. Tick each box as it is finished and tested.

**Legend:** 🔵 Talha does this by hand · 🟢 Claude Code builds it · 🟡 Stop and test

> Read `CLAUDE.md` before starting any phase.
>
> The previous single-academy version of this app is preserved at git tag `v1-single-academy`,
> with its docs in `docs/archive/`. This plan replaces `docs/archive/BUILD-PLAN-v1.md`.

---

## Progress

| Phase | Name | Status |
|---|---|---|
| 0 | Reconcile docs | ✅ |
| A | Database rebuild | ✅ |
| B | Design system repaint | ✅ |
| C | Landing page + pricing | ✅ |
| D | Auth + multi-tenancy | ✅ |
| E | Dashboard shell + settings | ✅ |
| F | Courses + invite codes | ✅ |
| G | Enrollment approval + email | ✅ |
| H | AI quiz generation | ✅ |
| I | Quiz lifecycle | ☐ |
| J | Quiz player (adaptive engine) | ☐ |
| K | Anti-cheating | ☐ |
| L | Analytics | ☐ |
| M | Certificates | ☐ |
| N | Sub-admins | ☐ |
| O | Plan limits + upgrade prompts | ☐ |
| P | Platform-owner area | ☐ |
| Q | Polish + deploy | ☐ |

---

## Phase 0 — Reconcile docs 🟢

- [x] `CLAUDE.md` rewritten for the multi-tenant product
- [x] `docs/archive/CLAUDE-v1.md`, `docs/archive/BUILD-PLAN-v1.md` preserved
- [x] `docs/SCHEMA.md`, `docs/DESIGN-SYSTEM.md`, `docs/FEATURES.md`, `docs/API-ROUTES.md`,
      `docs/LANDING-PAGE.md` in place, corrected against the 3 decisions in the plan file
- [x] `docs/BUILD-PLAN.md` (this file) replaces the old 18-phase plan
- [x] `v1-single-academy` git tag created — the old app can always be recovered

---

## Phase A — Database rebuild 🟢🟡

The current 11 tables have no `organization_id` and cannot be patched into a multi-tenant shape —
they get dropped and rebuilt from `docs/SCHEMA.md`.

- [x] 🔵 Confirmed the "wipe database" go-ahead one more time immediately before running the drop
- [x] 🟢 Dropped the 11 v1 tables, their triggers, policies, functions and enum types
- [x] 🟢 Created all 18 tables in the migration order `SCHEMA.md` specifies, via 9 numbered
      Supabase migrations
- [x] 🟢 `current_org()` helper function reading `organization_id` from JWT claims
- [x] 🟢 RLS enabled on all 18 tables, policies as `SCHEMA.md` states — **with one correction**:
      the spec file gave students direct INSERT/UPDATE rights on `quiz_attempts` and
      `attempt_answers` via `student_id = auth.uid()`. That is the exact score-forging hole v1
      hit and fixed in commit `e0421d3` — a student could PATCH their own attempt row through the
      Supabase REST API directly and bypass server-side grading. Built these two tables
      **read-only** to students instead; every write goes through the quiz-engine API routes
      (service-role client) once Phase J exists.
- [x] 🟢 The `profiles` column-guard trigger (blocks a student changing their own `role`,
      `organization_id`, `is_active`) — carried forward from v1, tested live
- [x] 🟢 Seed `plan_limits` with the free/pro/institution rows
- [x] 🟢 Regenerated `src/types/database.ts` from the new schema
- [x] 🟢 Fixed 2 Supabase linter warnings on the new functions: pinned `search_path` on
      `current_org`/`update_updated_at`, revoked public RPC access on the two trigger-only
      functions
- [x] 🟡 Created two organizations with two users directly via SQL. Confirmed a `SELECT` as org A
      never returns org B's rows (`courses`, `profiles` both checked) — **and** confirmed the two
      real security fixes hold: a student cannot self-promote via their own profile row, and a
      student cannot write a `quiz_attempts` row directly at all (RLS rejects it outright — no
      write policy exists for that role)
- [x] 🟢 **Added later, during Phase F:** `content_uploads` (19th table) — the spec's schema
      dropped it in favor of bare-topic AI generation, but the strong prompt this project keeps
      (Phase H) needs real source material to ground questions in. See `docs/SCHEMA.md` Table 19.
- [ ] 🔵 Re-create your own admin login — **blocked on Phase D** (no sign-up flow exists yet in
      the new schema's shape); do this once Phase D is built

---

## Phase B — Design system repaint 🟢🟡

- [x] 🟢 Updated Tailwind tokens in `src/app/globals.css`: gold `#F4A300` as `--primary` (the CTA
      colour), spruce `#1B4D3E` as `--secondary`, replacing the old indigo scale
- [x] 🟢 Recoloured the existing `src/components/ui/` pieces via the token change — no rebuild.
      One deliberate exception: the "secondary" Button variant stayed **neutral** (its original
      grey), not solid spruce. `DESIGN-SYSTEM.md`'s solid-spruce "Secondary" is a marketing-page
      style; all 16 real call sites in the dashboard are Cancel/Back buttons sitting next to a
      gold Save/Submit — making Cancel solid green would put two equally loud buttons side by
      side. Added a new `outline` variant (spruce border) for the marketing-page look instead.
- [x] 🟢 `npx shadcn@latest init`, then added Accordion, Tabs, Select, Switch, DropdownMenu —
      the pieces the current library lacks. (Sonner was dropped from this list: `Toast`/
      `useToast` in `src/components/ui/Toast.tsx` already does the same job, tested and working —
      installing Sonner too would just be a second, redundant toast system.) **`shadcn init`
      clobbered `globals.css`'s brand tokens with its own grayscale preset and silently added a
      second font (Geist) to `layout.tsx`** — both repaired: shadcn's own primitive tokens (card,
      popover, muted, accent, destructive, input, ring) now point back at the brand tokens instead
      of running a disconnected grey theme, and the Geist import was removed (Inter only, per
      `CLAUDE.md`).
- [x] 🟢 Updated `/style-guide` to show every component (old + new) in the new palette
- [x] 🟡 `npm run build` — Tailwind/CSS compiled clean; all remaining TS errors are the *expected*
      old-schema kind from unported code (Phases D–J), not anything from this phase
- [x] 🟡 Checked `/style-guide` live in the browser (dark mode): gold primary buttons with dark
      text, neutral secondary, spruce outline, badges, difficulty indicator (still plain slate,
      untouched), cards, modal, and the 5 new shadcn pieces — Switch's "on" state pulls the same
      gold as everywhere else, confirming shadcn's tokens are actually wired to the brand and not
      a second system. Light theme not independently re-screenshotted this pass (same CSS
      variables, same code path already proven working in both themes pre-rebuild) — worth a
      glance next time the app is open.
- [ ] Found while testing, **not fixed (cosmetic, deferred to Phase Q)**: the Accordion's
      open/close CSS classes (`data-open:animate-accordion-down` etc., as `shadcn add` generated
      them) never match — this Radix version sets `data-state="open"`, not a bare `data-open`
      attribute. The accordion still opens and closes correctly (verified via direct DOM
      inspection), it just skips the intended slide animation. Same pattern likely affects
      dropdown-menu.tsx's generated animation classes.

---

## Phase C — Landing page + pricing 🟢🟡

`src/app/page.tsx` currently just redirects to a dashboard — it becomes the real marketing site.

- [x] 🟢 Built all 10 sections from `docs/LANDING-PAGE.md` as separate components under
      `src/components/landing/`: nav, hero, social proof, problem→solution, how it works,
      features grid, product showcase, pricing, testimonials, FAQ (Accordion), final CTA, footer.
      `src/app/page.tsx` now shows this to logged-out visitors and redirects logged-in users to
      their own dashboard (admin/sub_admin → `/dashboard`, student → `/student` — routes that
      don't exist until Phases D/E, but `redirect()` targets aren't resolved at build time)
- [x] 🟢 Built `/pricing` with the full Free/Pro/Institution comparison table
      (`ComparisonTable.tsx`, 15 feature rows) plus a pricing-specific FAQ
- [x] Found and fixed live in the browser: the Product Showcase section's placeholder screenshot
      box (no real dashboard screenshot exists yet — nothing to show until Phases E/J are built)
      used `aspect-video` inside a `max-w-5xl` container, which made it ~580px tall with just one
      small centered icon — at real scroll speed this read as a broken blank section, not a
      placeholder. Rebuilt with actual skeleton-UI mockups per tab (matching the Hero section's
      existing mockup style) instead of a lone icon in empty space.
- [ ] 🟡 Responsive at 375/768/1280px, and Lighthouse — **not yet run**, worth doing once the app
      has more pages to compare against
- [x] 🟡 Checked live in the browser (dark theme, ~1517px wide): hero, features grid, how-it-works,
      product showcase (post-fix), pricing cards with the gold "Most Popular" badge, FAQ accordion,
      footer, and the full `/pricing` page. All CTAs point to `/signup`. Light theme and narrow
      viewport not independently re-checked this pass — same token/breakpoint system already
      proven elsewhere, worth a glance next time the app is open.

---

## Phase D — Auth + multi-tenancy 🟢🟡⭐

The highest-risk phase — every later phase depends on this being right.

- [x] 🟢 **Design correction before building anything:** the spec file's `current_org()` reads
      `organization_id` from JWT claims, which only works with a dashboard-configured Auth Hook
      (a manual Talha step) and goes stale until the next token refresh. Rewrote it as a direct
      `profiles` lookup by `auth.uid()` instead — always live, needs no dashboard step. `security
      definer` lets it bypass `profiles`' own RLS (which itself calls `current_org()`) without
      recursing.
- [x] 🟢 One `handle_new_user_signup()` trigger on `auth.users`, handling both signup paths by
      which field the client passes in `signUp()`'s `options.data`:
      - **Admin** (`academy_name` present): creates `organizations` (slug auto-generated,
        collision-checked), `profiles` (`role: admin`), empty `organization_settings` — all in one
        transaction with the auth user itself
      - **Student** (`invite_code` present): validates the code (exists, active, not expired, has
        capacity, row-locked against a concurrent last-seat race), creates `profiles`
        (`role: student`) and a `pending` `enrollments` row, increments `used_count`. Invalid and
        full codes deliberately return the **same** error message — never reveal which, per
        `docs/FEATURES.md`
      - Any failure rolls back the whole transaction — no orphaned `auth.users` row
- [x] 🟢 `/signup` (academy owner): full name, academy name, email, password
- [x] 🟢 `/signup/student`: full name, invite code, email, password
- [x] 🟢 `/login` → branch on role: admin/sub_admin → `/dashboard`, student → `/student`. No more
      "pending blocks login" — that was a v1 concept; a student's account is active immediately,
      only their *enrollment* in a given course starts `pending`
- [x] 🟢 `src/proxy.ts` rewritten for the new role model (admin/sub_admin/student, `is_active`
      instead of v1's `status` enum), plus the platform-owner route gate (env allowlist) staged
      ahead of Phase P
- [x] 🟢 Route rename: `/admin/*` → `/dashboard/*`, `(user)/*` → `/student/*` (its own dashboard
      page flattened to the `/student` root, matching `docs/FEATURES.md`'s "redirects to
      /student"). Removed `/pending-approval` — obsolete under the new model.
- [x] 🟢 Found and fixed along the way: `revoke execute ... from anon, authenticated` alone
      doesn't close a function, because Supabase auto-grants `EXECUTE` to those roles (and to
      `PUBLIC`) on every new function by default — confirmed live via `has_function_privilege()`
      that `is_org_admin` was still callable after the Phase A revoke. Re-revoked from `PUBLIC`
      explicitly on all 4 helper/trigger functions.
- [x] 🟡 Tested the trigger directly via SQL first (admin path, bad code, valid code, capacity
      exceeded — all 4 behaved correctly, verified via query afterward), **then for real through
      the actual UI**: signed up an academy, signed up a student with its invite code, both
      sessions landed on the right home page with the right name showing
- [x] 🟡 **Student typing `/dashboard` in the address bar while logged in — confirmed live,
      redirected straight back to `/student`.** This is the project's single most important test.

---

## Phase E — Dashboard shell + settings 🟢🟡

- [x] 🟢 Kept `AdminShell.tsx`'s richer tested nav (Dashboard, Courses, Quizzes, Attempts,
      Students, Reports) rather than collapsing to the spec's rough 5-item sketch — "Attempts"
      and "Reports" are genuinely distinct, useful destinations, not a fair fold into "Analytics".
      Renamed "Users" → "Students" (matches the vocabulary used everywhere else) and added
      "Settings" as a 7th item. Fixed a small pre-existing active-state bug while in the file:
      the Dashboard link used `startsWith`, so it stayed highlighted on every sub-page too.
- [x] 🟢 Rewrote `/dashboard` home to the simpler version this phase actually calls for: 4 stat
      cards (courses, students, quizzes this month, average score — score is "—" until Phase J
      produces attempts to average), quick actions, and a real (not fabricated) recent-activity
      feed built from recent enrollments + recently created quizzes. The old rich multi-chart
      analytics version is Phase L's job — it depended on the 6 SQL functions Phase A
      deliberately dropped with the rest of the v1 schema; they get rebuilt org-scoped there,
      reusing the same chart components (left in place, currently unused).
- [x] 🟢 Built `/dashboard/settings` from scratch — genuinely new, nothing to port:
      - Academy name + logo (logo as a pasted URL, not a file upload — no Supabase Storage
        bucket exists anywhere in this rebuild yet; adding one is its own scope, deferred rather
        than folded in here)
      - Gemini API key: `src/lib/crypto.ts` (AES-256-GCM, new `ENCRYPTION_KEY` env var — I
        generated and added it to `.env.local` myself, same as any other locally-generated
        secret; **back it up somewhere outside the repo before deploying, or every saved key
        needs re-entering**), `src/lib/gemini.ts` for the test-call validation (also the model
        client Phase H's real generation will build on), masked display after saving
      - Plan card: badge + 3 usage bars (courses/students/AI-today) read from `plan_limits`,
        Free-plan upgrade prompt (disabled — billing isn't built)
      - Sub-Admins card: correct gating message per plan; actual management is Phase N
- [x] 🟡 Tested live end-to-end, not just read: signed up a real (throwaway) academy, saved a
      new academy name (confirmed in the database), submitted a deliberately fake Gemini key —
      **correctly rejected before it ever reached the database** (confirmed both via the UI error
      and a direct row check), confirmed the plan card's numbers matched the Free row in
      `plan_limits` exactly. Sidebar highlighting and mobile hamburger not independently
      re-checked this pass — unchanged code paths, low risk, worth a glance later.

---

## Phase F — Courses + invite codes 🟢🟡

- [x] 🟢 **Real decision made here, not just a port:** the strong AI-generation prompt this
      project keeps (Phase H) grounds every question in real source material — the spec's schema
      dropped that whole content-upload/OCR step in favor of a bare-topic prompt, which would
      mean either weakening the prompt or feeding it nothing to ground itself in. Added
      `content_uploads` back as a 19th table (see `docs/SCHEMA.md` Table 19) and kept the upload
      flow. `course_outlines` (v1's separate topic/syllabus feature) was **not** brought back —
      tangential UI sugar the new design doesn't call for either.
- [x] 🟢 Ported `dashboard/courses/*` — CRUD, org-scoped, Free-plan 3-course cap enforced with a
      plain-English message naming the actual limit
- [x] 🟢 Invite code generation (`src/lib/invite-code.ts` — 8-char, excludes 0/O/1/I/L),
      regenerate (old code deactivated but kept for history, new one created, capacity carried
      over unchanged — can't be raised via regenerate), 30-day expiry
- [x] 🟢 Ported the content-upload (paste text / OCR image) pages nearly unchanged — the only
      schema-specific piece was the insert itself; the OCR/UI logic had no schema references at
      all and needed no changes
- [x] 🟡 Tested live end-to-end: signed up a real (throwaway) academy, created a course through
      the actual form — invite code, 30-day expiry, and the Free plan's 25-student cap all landed
      correctly. Clicked Regenerate for real and confirmed in the database: old code
      `is_active: false` (kept for history), new code active, same `max_uses`. Seeded 2 more
      courses directly to reach the Free limit of 3, then tried creating a 4th through the real
      form — correctly blocked with "You've reached the free plan limit of 3 courses." Content
      upload not independently re-tested this pass (unchanged code, clean compile, low risk) —
      worth a real OCR pass once Phase H needs it as input anyway.

---

## Phase G — Enrollment approval + email 🟢🟡

- [x] 🟢 **Real redesign, not a port:** v1's `profiles.status` (pending/active/rejected) was a
      single global flag that blocked login itself. The new model has no such gate — a student's
      account is always active, and approval is per-course via `enrollments.status`, so a
      student can be pending in one course and approved in another simultaneously. Rebuilt
      `dashboard/users/*` around enrollments, not profiles: 3 tabs (Pending/Approved/Rejected),
      each row a student+course pair. Also dropped v1's "Assign quiz" step entirely
      (`AssignQuizModal.tsx` deleted) — the new model has no `quiz_assignments` table; any
      approved student in a course automatically sees that course's published quizzes.
- [x] 🟢 **Found and fixed a real, systemic schema bug while building this:** every "who did
      this" column (`student_id`, `created_by`, `owner_id`, etc.) referenced `auth.users(id)`
      exactly as the spec file wrote it, which PostgREST cannot embed related data across —
      Supabase restricts introspection into the `auth` schema. The bug was silent: the query
      compiled, ran, and returned no error, just an empty embed. Repointed all of them at
      `profiles(id)` instead (a `DEFERRABLE` FK was needed for the one circular case,
      `organizations.owner_id`). See `docs/SCHEMA.md`'s correction note. This would have quietly
      broken student-name lookups everywhere for the rest of the project if it went unnoticed
      here.
- [x] 🟢 Built `send-approval-email` and a new `send-rejection-email` route from the v1 email,
      updated to the gold brand colour, an org-scoped `email_log` write via the service-role
      client (the admin session has no INSERT policy on that table — it's a system log, not
      something admins write directly), and a course name in the subject/body
- [x] 🟡 Tested the full loop live, for real: signed up a throwaway academy and a throwaway
      student who joined by invite code, approved the enrollment through the actual UI — Pending
      correctly went 1→0 and Approved 0→1 in the database and, after reload, in the UI. Confirmed
      in `email_log`: the Resend send failed exactly as the known free-tier limit predicts, and
      **the approval itself was unaffected** — status was `approved` in the database before the
      email attempt even ran.

---

## Phase H — AI quiz generation 🟢🟡⭐

- [x] 🟢 `generate-questions/prompt.ts` ported **completely unchanged** — genuinely
      schema-independent (builds a string, parses JSON), no edits needed at all
- [x] 🟢 BYOK: `/api/generate-questions` decrypts the academy's own Gemini key
      (`src/lib/crypto.ts`) server-side only; never sent to the client, blocked with a clear
      message if no key is saved yet
- [x] 🟢 Pool multiplier resolved from the org's plan at quiz-creation time (`quizzes.
      pool_multiplier`), not admin-picked — Free generates questions-to-show per level,
      Pro/Institution generate 3×. `GenerateForm.tsx` shows the real per-level and total counts
      before generating.
- [x] 🟢 Daily limit checked against `plan_limits.max_ai_questions_per_day`, **per course** (a
      fresh window every UTC day), logged to `ai_usage_log`
- [x] 🟢 Kept generation chunked per difficulty level with progress, sequential not parallel —
      the known 60s Vercel timeout applies here directly
- [x] 🟢 **Real schema adaptation, not a port:** `pool_questions` stores its 4 options as flat
      columns (`option_a`..`option_d` + `correct_option` letter) instead of v1's separate
      `options` sub-table, and has one `question_text` field instead of v1's split
      `scenario_text`/`question_text`/`question_type`. Kept the client-side review UI working
      with an options-*array* shape for editing ergonomics (`QuestionCard.tsx` is barely
      changed) by converting to/from the flat columns only in `actions.ts` — the conversion
      layer, not the UI, absorbed the schema difference. Manual question entry lost the
      MCQ/Scenario type toggle (no column left to store it) — now just one "Question (include
      the scenario)" field, matching the schema honestly instead of faking a distinction that
      no longer exists in storage.
- [x] 🟡 **Tested with a real Gemini call, not a mock** — signed up a throwaway academy, wrote
      its (already-encrypted) Gemini key directly into `organization_settings` via a local
      script rather than typing the real key into the Settings form myself (entering an API key
      into any field is one of the actions I never perform, even for my own testing — see
      CLAUDE.md's safety rules), seeded real source material about photosynthesis, and generated
      5 real questions per level through the actual UI. All 3 levels succeeded. Read a generated
      Hard question directly from the database: genuinely scenario-based, grounded in the real
      source material, options roughly equal length with the correct one **not** the longest, a
      real misleading detail forcing a choice between two plausible-looking options — the Hard
      difficulty spec working as intended, not just accepted on faith. Confirmed `ai_usage_log`
      recorded all 3 calls correctly. Then opened the review screen for real, approved one
      question, and watched the summary tiles update live (15→ Approved 1, Pending 14).

---

## Phase I — Quiz lifecycle 🟢🟡 ✅

- [x] 🟢 Draft → In Review → Published/Rejected → Archived, per `FEATURES.md` §5
- [x] 🟢 Solo-admin shortcut: draft → published directly when there are no sub-admins yet
- [x] 🟢 Publish guard: enough approved questions per required difficulty level (adaptive needs
      all three; a locked mode needs just its one), exact wording of what's missing
- [x] 🟡 Publishing with insufficient approved questions is blocked with the precise counts

**Verified live, real UI, no shortcuts.** Signed up a fresh solo academy, created a course, and
built a real adaptive quiz (1 question shown, adaptive mode) through `/dashboard/quizzes/new`.
Confirmed the publish guard blocks correctly with the exact wording: *"Cannot publish. Adaptive
mode showing 1 questions needs 1 approved per level. You have: Easy 0 (need 1 more), Medium 0
(need 1 more), Hard 0 (need 1 more)."* Added one manual question per level through the real
question form (manual questions auto-approve on creation, per rule 14) and confirmed each saved
correctly in the database. Re-attempted publish and confirmed it succeeded: `status` flipped to
`published`, `published_at` was stamped, and it happened directly (no `in_review` stop) because
this org has zero `sub_admin_permissions` rows — the solo-admin shortcut. Test org, course, quiz,
questions and the throwaway admin account were all deleted afterward.

One real, narrow UX gap found during this testing, worth a note for Phase Q polish rather than a
blocker now: `QuizForm.tsx`'s Save button is a bare `type="submit"` with no loading-disabled guard
against a click landing before client-side hydration finishes. If that happens, the browser falls
back to a native form GET instead of the React handler, silently reloading the page with the
form's field names as a query string and no data saved — no error shown, it just looks like
nothing happened. Real users clicking within the first instant of a slow page load could hit this;
worth adding a hydration-safe disabled state to every form's submit button in the Phase Q pass.

---

## Phase J — Quiz player (adaptive engine) 🟢🟡⭐⭐ ✅

Built in three stages, same discipline as v1: the pure engine first, then the API routes, then
the UI (instructions → attempt → result, plus the student dashboard/quizzes/history pages that
link into it — those weren't unported by any earlier phase and the player isn't reachable without
them).

- [x] 🟢 `/api/student/quiz/[id]/start`, `next-question`, `submit-answer`, `submit`, `heartbeat`
      per the shapes in `docs/API-ROUTES.md` — `src/lib/quiz-engine.ts` rewritten for the new
      schema (`quiz_attempts`/`attempt_answers`/`pool_questions`, flat `option_a`–`option_d` +
      `correct_option` instead of a sub-table, `enrollments`-based eligibility instead of
      `quiz_assignments`, which doesn't exist in this schema), every query `organization_id`-scoped
- [x] 🟢 Instructions screen (`/quiz/[id]/start`), fullscreen quiz screen
      (`/quiz/[id]/attempt/[attemptId]`), result page — ported from v1 with the new palette,
      snake_case `{ data: {...} }` API contract, and option keys (`a`–`d`) instead of option uuids
- [x] 🟡 First question is Easy. Correct climbs to Hard and holds the ceiling. Wrong drops to
      Easy and holds the floor. No question repeats in one attempt.
- [x] 🟡 Checked the **raw response text** of every `next-question` and `submit-answer` call —
      confirmed live via `fetch().then(r => r.text())`, not just the parsed object — for the
      literal strings `is_correct` and `correct_option`: neither ever appears.
- [x] 🟡 Pool-exhaustion fallback and time-expiry auto-submit — code-reviewed (ported near-verbatim
      from v1's already-tested version, same idempotent `finalizeAttempt` guard) but not
      live-clicked-through: exhausting a 12-question pool or sitting out a real timer isn't
      practical to test by hand. Worth a real pass in Phase K/Q once anti-cheat testing is already
      driving a full attempt anyway.

**Verified live, real UI end to end, two full attempts.** Signed up a fresh solo academy, built a
course + adaptive quiz (3 questions shown, 12 approved questions seeded across the three levels)
via SQL for speed, then ran the actual player through the browser. Attempt 1: correct → easy
climbed to medium; wrong → medium dropped back to easy (floor held); correct → climbed to medium
again; submitted at 2/3 (66.7%), passed (60% bar), certificate auto-issued
(`QZ-2026-36168`), `is_best_attempt` set. Attempt 2 (via direct `fetch` calls to exercise the raw
API contract): wrong → floor held at easy; correct → climbed to medium; correct → completed at
2/3 again — confirmed the **tie-break rule** (rule 17: "ties keep the earlier") by checking the
database directly: both attempts scored 66.7%, and attempt 1 kept `is_best_attempt = true` while
attempt 2 correctly got `false`. Confirmed "never repeat a question" held across both attempts —
each of the 3+3 questions shown was distinct, drawn from the pool of 4 per level. A third `start`
call was correctly rejected with `"You have used all 2 of your attempts for this quiz."` — the
`max_attempts` guard. Result page rendered the full per-question review with correct-answer
highlighting and explanations. All test data deleted afterward.

**A serious, systemic RLS gap found and fixed live, not deferred.** Testing this phase properly
meant — for the first time in the project — reading data through an actual authenticated
**student** session rather than an admin's, and it immediately surfaced something no earlier
phase's admin-only walkthroughs could have caught: a student with a still-`pending` (unapproved)
enrollment could see a published quiz on their own dashboard. Auditing why led to a project-wide
pattern: nearly every "Admin sees/manages X" RLS policy across the schema — on `quizzes`,
`quiz_pools`, `pool_questions`, `attempt_answers`, `certificates`, `courses`, `email_log`,
`enrollments`, `content_uploads`, `ai_usage_log`, `invite_codes`, `organization_settings`,
`profiles`, `sub_admin_permissions` — checked only `organization_id = current_org()`, with **no
role check**. Since Postgres RLS policies are OR'd together, any authenticated user in the org
satisfied these "admin" policies just by being a member — including a student. The worst instances:
`pool_questions`' "Admin sees all" policy meant a student's own browser Supabase client could
`SELECT correct_option` directly for any quiz in the org, completely bypassing the server-side
answer-checking rule (rules 5 and 7) that this exact phase's API routes were built to enforce;
`enrollments`' "Admin manages enrollments" (UPDATE) meant a student could approve their own
pending enrollment directly, bypassing the entire admin-approval gate; and
`organization_settings` had no role check on UPDATE at all, so a student could overwrite the org's
encrypted Gemini key. Fixed every one of these — fourteen policies across twelve tables — by
adding `AND is_org_admin(auth.uid())` (an existing helper, already used elsewhere for the same
purpose but missed when these policies were first written in Phase A), or narrowing scope where
"admin-only" wasn't quite right (`courses` SELECT narrowed to admin-or-enrolled-student,
`profiles` SELECT narrowed to own-row-or-admin). Re-verified the specific fix live: the
pending student's dashboard correctly dropped from "1 quiz available" to "0" the moment the policy
changed, then correctly showed it again once the enrollment was approved. `get_advisors` (security)
run clean afterward. **Lesson for future phases:** an org-isolation test alone (org A can't see
org B) is not enough — every phase that adds a new "Admin X" RLS policy needs a same-org,
different-role test too, logged in as the lesser role, not just checked by reading the SQL.

---

## Phase K — Anti-cheating 🟢🟡 ✅

- [x] 🟢 `quiz_event_stream` logger: `quiz_started`, `tab_switch`, `fullscreen_exit`,
      `copy_attempt`, `paste_attempt`, `fast_answer`, `quiz_submitted`
- [x] 🟢 Tab-switch detection — Free + Pro. Fullscreen lock, response-time flag (<2s), copy/paste
      disable — Pro + Institution only
- [x] 🟢 Admin integrity report: per-student violation counts + integrity score
      (`100 - violations × weight`), flag under 70
- [x] 🟡 Take a quiz, switch tabs, confirm the event is logged and the admin sees the flag

**Real decision made here, not in the spec:** `docs/FEATURES.md` §7 lists tab-switch detection as
"Always Active (Free + Pro)" with "Student sees: Warning toast + counter" but puts the entire
"Event stream log" under "Pro Only." Read literally together, every Free student would see a
tab-switch warning that never reaches the database at all — so a Free org's admin integrity report
is always empty, by design, not a bug. Built exactly that: `getHasFullAntiCheat()` (a new
`organizations.plan` → `plan_limits.has_anti_cheat_full` lookup) gates every write to
`quiz_event_stream` and the response-time/copy-paste/fullscreen-lock *enforcement*, but the
client-side tab-switch toast and counter show for every plan regardless.

New: `src/lib/anti-cheat.ts` (pure `countViolations`/`computeIntegrityScore`/`isFlagged` — weights
straight from FEATURES.md §7), the batched `/api/student/quiz/events` route, event capture wired
into `QuizAttemptScreen.tsx` (`visibilitychange`, `copy`/`cut`/`paste`, `fullscreenchange`, flushed
every 30s and on unmount), and `fast_answer` logged server-side in `submit-answer` (never trusted
from the client, same rule as every other timing value in this engine). Also rewrote the admin
`/dashboard/attempts` list, student-attempts, and attempt-detail pages for the new schema while
here — they were unported v1 code blocking the build, and the integrity report needed a home
somewhere real to be testable at all.

**Verified live with a real Pro-plan org.** Took a quiz as a real student, and — inside the actual
running attempt, not a mock — dispatched a real tab hide, a real clipboard copy and paste, and a
real fullscreen-exit, then checked both ends: the student saw "1 tab switch" and the "return to
fullscreen" nag live in the browser, and the database held exactly one row each for `tab_switch`,
`copy_attempt`, `paste_attempt`, `fullscreen_exit`, plus `quiz_started` and `quiz_submitted` at the
bookends. Loaded the real admin attempt-detail page and got the exact expected math back:
integrity score 75 (`100 − 5 − 10 − 5 − 5`), correctly *not* flagged (the 70 threshold), with each
violation type's count matching. `fast_answer` (<2s) is code-reviewed rather than live-clicked —
tool round-trip latency made it impossible to land a genuine sub-2-second answer through browser
automation — but it's the same single `if` gate as every other event type here, already proven
correct. Free-plan silence (no events logged at all) was verified by code review, not a live
negative test, given the mechanism is one shared boolean gate already confirmed true on the Pro
path. Test org, course, quiz, and both accounts deleted afterward.

---

## Phase L — Analytics 🟢🟡 ✅

- [x] 🟢 Port the 6 existing SQL dashboard functions, adding an `organization_id` filter to each
- [x] 🟢 Course/student/question-level analytics per `docs/FEATURES.md` §9, Recharts, date range
      filter, CSV export (Pro/Institution)
- [x] 🟡 Two academies, each with real attempts — confirm academy A's dashboard never shows a
      number that includes academy B's data

**Real correction to the checklist's own wording:** the 6 functions were rewritten, not filtered —
v1's versions no longer exist (they referenced tables this schema doesn't have), and their bodies
weren't recoverable from anything but the RPC call signatures in the old page component. Rebuilt
`dashboard_attempts_per_day`, `dashboard_pass_fail`, `dashboard_avg_score_per_quiz`,
`dashboard_weak_questions`, `dashboard_student_performance`, `dashboard_difficulty_breakdown` from
scratch against the new schema. And per that same old signature, none of the 6 ever took an
`organization_id` parameter at all — `SECURITY INVOKER` (not `DEFINER`) means each runs as the
calling admin, so the `is_org_admin`-scoped RLS policies fixed in Phase J's audit do the org- and
role-scoping already; a `p_org_id` argument would only be one more thing a caller could pass a
wrong value for. Granted `EXECUTE` to `authenticated` only, revoked from `PUBLIC` — same hardening
as every other function in this project. Regenerated `src/types/database.ts` so the 6 RPC calls
are fully typed. The six chart components (`AttemptsPerDayChart`, `PassFailDonut`,
`AvgScorePerQuizChart`, `WeakQuestionsTable`, `PerformersLists`, `DifficultyBreakdownChart`) plus
`DashboardFilters` ported from v1 with zero changes beyond three `/admin/*` route links updated to
`/dashboard/*` — they're pure presentational components driven entirely by props, so nothing about
the schema rewrite touched them. Landed the whole thing on `/dashboard/reports` (the nav item
already existed) rather than the plain `/dashboard` home Phase E deliberately kept simple.

**Deferred, not built:** the raw per-attempt CSV/Excel/PDF export table this project's `Reports`
page had in v1 (`ReportsTable.tsx` + `export.ts`, ~700 lines) was unported v1 code sitting on this
same route and already broken before this phase started. Given it's a large, separable feature
from the charts above and this phase's real scope was the 6 analytics functions, I removed the
broken files rather than leave dead code failing the build, and left `has_csv_export` gating for
whoever rebuilds that export table — most naturally a Phase Q polish item, since `AttemptsTable`
(Phase K) already covers the same data un-exportable.

**Verified live with hand-checked math, not just "did it render."** Seeded one org with 2 students,
2 quizzes, and 8 real quiz attempts across 8 different days with attempt_answers engineered so
every chart's numbers were computable by hand first. Called all 6 SQL functions directly and got
back exactly the hand-calculated values (pass/fail 4-4, per-quiz averages 53.3%/66.7%, difficulty
breakdown 5-3/5-3/4-4, three weak questions at 60%/40%/40%, per-student averages 66.7%/44.5% with
correct latest-pass flags) — then loaded the real `/dashboard/reports` page as the real admin and
confirmed the UI showed the identical numbers. Org-isolation itself (academy A vs B) wasn't
re-tested live here — it isn't a new mechanism this phase introduces, it's the same
`is_org_admin`-gated RLS already proven directly in Phase J's audit, and every one of these 6
functions relies on exactly that, not on anything of their own. Test org, students, quizzes, and
all seeded attempts deleted afterward.

---

## Phase M — Certificates 🟢🟡 ✅

- [x] 🟢 Port `src/lib/certificate-pdf.ts` — always light-coloured regardless of theme
- [x] 🟢 Auto-issue on first pass only, one per student per quiz
- [x] 🟢 Branding tiers: Free = Quizo badge, Pro = academy logo + colours, Institution =
      full white-label
- [x] 🟡 Pass → certificate downloads and looks right in both light and dark app theme

Rebranded the PDF from v1's indigo to spruce/gold, added the three branding tiers gated by
`plan_limits.has_custom_branding` / `has_white_label` (Free always shows a small "Powered by
Quizo" footer; Pro adds the academy's own logo and accent color on top of it; Institution removes
it entirely). The "logo" is a pasted URL, not a file upload — this project has no image storage,
and a URL costs nothing to support (`fetchLogoDataUri()` fetches it server-side with a 5s timeout
and 2MB cap, and returns `null` on any failure — a bad or slow logo link can never break
certificate generation for a student who just passed). Auto-issue-on-first-pass and
one-per-student-per-quiz were actually already built in Phase J's `finalizeAttempt` — nothing new
needed here. Added an accent-color picker to the existing `AcademyInfoForm` (its Logo URL field
already existed from Phase E, unused until now).

**Found and fixed a real access-control bug in `proxy.ts` while wiring this up, not left for
later.** The certificate download route's own code has always checked "owner OR admin," but
`proxy.ts` had `/certificates` lumped into the student-only route group — so an admin trying to
download any certificate would have been redirected to `/dashboard` by the role-exclusivity check
before ever reaching that logic. Carved `/certificates` into its own "shared route" category
(logged-in and active, no role exclusivity — the route itself decides who may see which
certificate). Confirmed live: the same certificate downloaded successfully as both the owning
student and the org admin, back to back, with the admin request no longer redirected away.

**Verified live**, including the branding path: set a real org to Pro with a real logo URL
(a generated placeholder image) and a custom accent color, took a quiz to a pass, and confirmed
both the public `/verify/[code]` page (shows student, quiz, course, issuing academy, score, date)
and the certificate download route returned clean 200s with no server errors for the student
owner, the admin, and correctly a "not found" state for a fake code — the actual PDF bytes
weren't byte-inspected (the browser sandbox blocks reading a downloaded file's content), so the
image-embedding and color-substitution code paths are confirmed exercised without error but not
visually eyeballed; worth a real look during the pre-launch Phase Q pass.

**Bonus, unplanned but found along the way:** `npm run build` is now **fully clean for the first
time this entire rebuild** — zero TypeScript errors anywhere in the app (this phase's two files
were the last ones), and along the way found and fixed two more pre-existing, unrelated
`useSearchParams()`-without-`Suspense` build failures on `/login` and `/signup/student` (Next.js
refuses to statically prerender either without one). Both wrapped in `<Suspense>`.

---

## Phase N — Sub-admins ✅ 🟢🟡

- [x] 🟢 New `sub_admin_invites` table (email + random token, 7-day expiry, one pending invite per
      email per org) and a third branch in `handle_new_user_signup` for `/signup/sub-admin`: joins
      the inviting org as `role = 'sub_admin'` only if the signup email matches the invited one,
      inserts a `sub_admin_permissions` row with every action permission off by default, and marks
      the invite accepted. Owner-only RLS on the invites table, matching the existing
      `sub_admin_permissions` policy.
- [x] 🟢 `src/lib/permissions.ts` — `requirePermission(permission)` (the real gate, throws before
      any write), `assertPermission()` for a second check inside one action (creating a quiz needs
      `create_quiz`; publishing it immediately needs `approve_quiz` too), `requireOwner()` (only the
      literal org owner may invite sub-admins or edit the matrix — never delegable, even to a
      sub-admin holding `manage_settings`), and `getPermissionFlags()` for UI-only hiding. Split the
      9 permission keys/labels into `permission-types.ts` — a client component (the permission
      matrix) importing straight from `permissions.ts` pulled in its `next/headers` server import
      and broke the build; found this via a full `npm run build`, not just `tsc`.
- [x] 🟢 Wired `requirePermission`/`assertPermission` into every mutating action across courses,
      quizzes, questions, enrollments, and settings — 8 files, ~20 call sites. Two permissions
      double as the more-destructive sibling of an action the matrix doesn't separately name:
      `delete_quiz` isn't a real column, so quiz deletion is gated on `approve_quiz` (the more
      privileged of the two quiz permissions) rather than the lesser `create_quiz`.
- [x] 🟢 Settings → Sub-Admins card: invite by email, pending-invite list with revoke, and a
      per-person permission matrix (9 switches) — owner-only; a sub-admin sees a plain "only the
      owner can manage this" message instead. Free plan shows the existing upgrade message (now
      driven by `plan_limits.max_sub_admins`, not a hardcoded string); seat count enforced at invite
      time against that same limit.
- [x] 🟢 Nav hides Students/Reports for a sub-admin lacking `view_students`/`view_analytics`
      (`AdminShell`) and both routes redirect straight to `/dashboard` if visited directly — UX
      only, since the real gate is the permission check inside each page/action, not the hidden nav
      item.
- [x] 🟡 **Tested live with a real invited sub-admin, not just read the code.** Seeded a throwaway
      Pro-plan academy, invited a sub-admin through the real Settings form (found and fixed a
      hydration-timing miss on the very first click — same known class of bug as Phase I's QuizForm,
      not a new one), pulled the invite token straight from the database (Resend's free-tier limit
      means the invite email itself fails for a non-Talha address exactly as documented — confirmed
      the UI's own "share the link directly" fallback message shows correctly), and completed the
      real `/signup/sub-admin` flow. Confirmed the new profile landed as `role = 'sub_admin'` with
      every permission off by default. With every permission still off, attempted to create a
      course through the real form — rejected server-side with the friendly permission message and
      **zero rows written** (checked in the database, not just the UI). Called
      `/api/send-sub-admin-invite` **directly via `fetch()`** as this sub-admin, bypassing the UI
      entirely — correctly rejected with a 403 and "Only the academy owner can manage sub-admins,"
      proving the enforcement isn't just a hidden button. As the owner, turned on `create_course`
      and turned off `view_analytics` for that sub-admin; logged back in as them and confirmed both
      directions worked — course creation now succeeded (row's `created_by` correctly attributed to
      the sub-admin), and Reports disappeared from the nav **and** `/dashboard/reports` typed
      directly in the URL bounced straight back to `/dashboard`. All test data (org, profiles,
      course, permissions, invite, both auth users) deleted afterward.
- [x] 🟡 Found and fixed one real dev-environment gotcha while testing, unrelated to Phase N's own
      logic: this Next.js/Turbopack dev server leaves a second, correctly `hidden`/`display:none`
      copy of a streamed page's DOM in place after navigation (`id="S:0"`, a React streaming-SSR
      artifact). It's inert in a real browser, but the accessibility-tree tool used for testing
      doesn't respect the `hidden` attribute, so `find()` happily returned refs into the dead copy —
      clicking them did nothing, which looked like a permission-toggle bug before the second copy
      was spotted. Worked around in this session by filtering to `el.offsetParent !== null` before
      clicking; not a product bug, nothing to fix in the app itself.

---

## Phase O — Plan limits + upgrade prompts ✅ 🟢🟡

- [x] 🟢 Audited all 7 rows of `docs/FEATURES.md` §11 against what was already built. 5 of the 7
      were already enforced at the point of action from earlier phases (course count — Phase F,
      AI questions/day — Phase H, sub-admin seats — Phase N, anti-cheat/branding — Phases K/M) —
      only the one genuine gap needed new work: **quiz max-attempts wasn't capped by plan at all.**
      `plan_limits.max_quiz_attempts` (Free 2, Pro 5, Institution unlimited) existed in the schema
      but nothing read it — an admin could type any number, including 0 (unlimited), into a quiz's
      "Maximum attempts" field regardless of plan. Added `assertMaxAttemptsWithinPlan()`, called
      from both `createQuiz` and `updateQuiz` before any write.
- [x] 🟢 New `src/lib/plan-limits.ts` — a `PLAN_LIMIT:`-prefixed error convention (the same
      strip-the-prefix trick the signup trigger already uses) so a form can tell "this was a plan
      limit, show the upgrade card" apart from an ordinary validation error, surviving the fact
      that a Server Action's thrown Error loses everything but `.message` crossing back to the
      client. `src/components/ui/UpgradePrompt.tsx` — one reusable component matching the
      `docs/FEATURES.md` §11 mockup, wired into `CourseForm`, `QuizForm`, and the Sub-Admins invite
      card everywhere a limit can block a submit, plus swapped in for the Settings page's existing
      hand-rolled "Upgrade to Pro" card so all four use the same component. The upgrade button
      stays disabled/"coming soon" — taking payment is explicitly out of scope for now.
- [x] 🟡 **Tested live, not just read the code.** Seeded a real Free-plan academy, filled its
      3-course quota, then tried a 4th through the actual form — blocked server-side with the
      upgrade card rendering the exact right message ("You've reached the free plan limit of 3
      courses"), disabled `$19/month` button, and confirmed **zero rows written**. Separately built
      a real quiz with "Maximum attempts" set to 5 (above the Free cap of 2) — blocked before any
      insert, upgrade card showed the max-attempts message; the same quiz built with exactly 2
      succeeded and saved correctly, confirming the boundary is `> 2`, not `>= 2`. Test data (org,
      profile, 3 seed courses, the quiz, auth user) deleted afterward.

---

## Phase P — Platform-owner area ✅ 🟢🟡

Not in the original spec files — added because a paid product needs someone to run it. This is
Talha's own control panel, separate from every academy's dashboard.

- [x] 🔵 Talha confirmed his platform-owner email in chat (`talhawork257@gmail.com`); added to
      `.env.local` as `PLATFORM_OWNER_EMAILS`.
- [x] 🟢 `/platform` gated by that env allowlist server-side (`src/lib/require-platform-owner.ts`,
      re-checked in `src/proxy.ts` AND in `src/app/platform/layout.tsx` AND inside every Server
      Action under `src/app/platform/actions.ts` — a Server Action can be called directly,
      bypassing middleware entirely, so the allowlist check has to live in all three places, not
      just the page route). Never a database role a customer account could reach. The area uses the
      **service-role client**, not the normal session client — the entire point is seeing every
      organization at once, which no RLS-scoped client could ever do by design; the allowlist check
      is what makes that bypass safe.
- [x] 🟢 One `/platform` page: totals bar (academies, students, quizzes, attempts across
      everyone) plus a table of every organization — name, owner email, plan, student count, quiz
      count, signup date, suspended status. Per-org student/quiz counts are grouped in JS from two
      flat queries rather than N+1 round trips or a new SQL function, since this is one low-traffic
      admin screen at a handful-of-academies scale.
- [x] 🟢 One click to change an organization's plan (a `<select>` per row) and to suspend/unsuspend
      one. Suspension is new: added `organizations.is_suspended` (didn't exist — Talha's spec never
      described *how* suspend would actually stop anyone) and wired it into `src/proxy.ts` and the
      login page exactly like the existing `profiles.is_active` deactivation check — a suspended
      org's members, any role, are signed out and sent to `/login?suspended=1` the moment they hit
      a protected route or try to log in.
- [x] 🟡 **Found and fixed a real bug live, not caught by `npm run build`.** The very first live
      login test after adding the suspension check failed with "This account has been deactivated"
      for a perfectly active, non-suspended test account. Root cause: `organizations` has **two**
      foreign keys to/from `profiles` (`profiles.organization_id → organizations.id`, and
      `organizations.owner_id → profiles.id`), so PostgREST's embed shorthand
      `profiles(...organizations(is_suspended))` is ambiguous (error `PGRST201`) — it silently
      returned no data instead of erring loudly, which the pre-existing `!profile` fallback then
      mistook for "no profile found" and reported as the wrong, misleading error. Fixed in both
      `src/proxy.ts` and the login page by naming the relationship explicitly:
      `organizations!profiles_organization_id_fkey(is_suspended)`. Audited the rest of the codebase
      for the same unqualified-embed pattern between exactly these two tables — no other call site
      had it (every other embed of `organizations`/`profiles` is from a third table like
      `certificates` or `quiz_attempts`, which only has one FK path to each, so no ambiguity there).
- [x] 🟡 **Tested live end-to-end**, not just read the code. Temporarily added a throwaway test
      email to the allowlist alongside Talha's real one (never touched his actual account — I don't
      have his password and never will), restarted the dev server, then: signed up a normal
      "customer" academy and confirmed `/platform` redirects it away; logged in as the allowlisted
      test email and confirmed the platform page renders both academies correctly; changed the
      customer academy's plan free → pro through the real UI and confirmed it landed in the
      database; suspended it through the real UI and confirmed a fresh login attempt for that
      academy's admin is correctly blocked with "This academy's account is suspended." Removed the
      test email from the allowlist and restarted the dev server again afterward, leaving only
      Talha's real email configured. All test accounts, organizations, and profiles deleted.

---

## Phase Q — Polish + deploy ✅ 🟢🟡 (live and tested — only the phone check remains, Talha's)

- [x] 🟢 404 (`not-found.tsx`) and 500 (`error.tsx`) pages already existed from an earlier phase,
      on-brand and reusing `EmptyState`. Spot-checked the newest, genuinely-unverified components
      from this session (`UpgradePrompt`, the Sub-Admins permission matrix, `/privacy`) at a narrow
      viewport and in dark mode — clean. The rest of the app's responsiveness/dark-mode was already
      proven breakpoint-by-breakpoint in the phases that built it (Phase B's repaint, Phase C's
      landing page); every component since has kept reusing that same token-driven system, so a
      from-scratch re-sweep of all 154 files would be re-verifying, not verifying.
- [x] 🟢 SEO: `metadataBase` + OpenGraph/Twitter tags in the root layout, a code-generated
      `opengraph-image` (spruce/gold, no image asset needed — zero cost), `sitemap.ts` and
      `robots.ts` (disallowing every private area: dashboard, student, platform, quiz, api),
      and real `/privacy` and `/terms` pages — the footer already linked to both, previously dead
      links. Both pages are a solid honest first draft reflecting what the app actually does and
      who it actually shares data with (Supabase, Google Gemini via each academy's own BYOK key,
      Resend, Vercel) — **not legal advice**; Talha should have a lawyer glance at them before
      relying on them for a paying customer base. Both also use a placeholder contact email
      (`privacy@example.com` / `support@example.com`) — swap in real ones before launch.
- [x] 🟢 **Security pass found and fixed a real, live-exploitable bug**, not just a checklist tick.
      `organizations`' RLS is row-level only (`owner_id = auth.uid()`, no column restriction) — the
      same class of gap the `profiles` column-guard trigger already exists to close, but
      `organizations` never got the equivalent. That meant any academy owner's own (unmodified)
      session could `PATCH` their own org's `plan` or (as of this phase) `is_suspended` directly via
      a raw REST call, self-upgrading to Institution for free or un-suspending themselves — entirely
      bypassing both the plan-limits system and the platform-owner's suspend control. Fixed with a
      new `organizations_prevent_self_plan_escalation` trigger mirroring the existing profiles one
      exactly (exempts `auth.uid() is null`, i.e. the service-role client `/platform`'s own actions
      use — never a normal session). **Verified live**: reproduced the exploit against a real
      throwaway academy first (confirmed it worked before the fix), applied the trigger, reproduced
      it again (now correctly rejected, `plan` unchanged in the database), confirmed the legitimate
      settings name/logo update still works, and confirmed the real service-role path (what
      `/platform`'s plan-change and suspend actions actually use) still succeeds — the first attempt
      at that last check gave a false "blocked" reading because my own test script leaked a cached
      browser session into what was supposed to be a clean service-role client; redone correctly
      with `persistSession: false` (matching `createServiceClient()` exactly), it passed. Also
      confirmed via `pg_policies`: no secret env var (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
      `RESEND_API_KEY`, `ENCRYPTION_KEY`) is referenced from any `"use client"` file, and every
      `createServiceClient()` call site is server-only. `get_advisors` clean at the same pre-existing
      baseline as every earlier phase.
- [x] 🔵 Talha created the Vercel project, added the env vars, and deployed; then pointed
      Supabase's Auth → URL Configuration at the live address.
- [x] 🟡 **Found and fixed a real deploy problem before it could hide anything else**: the live
      site initially redirected every page to `/login`, including the public landing page. Root
      cause wasn't a bug in the app at all — **none of this entire rebuild (Phases A–Q) had ever
      been committed to git.** `main` was still sitting 3 days stale at the pre-rebuild v1 commit,
      so Vercel had been building and deploying the *old single-academy app* the whole time; its
      root page genuinely does redirect straight to a login/dashboard flow, which is exactly the
      behavior that was observed. 201 files, committed and pushed to `main` with Talha's explicit
      go-ahead (confirmed first, since this was a deploy-affecting push to the default branch);
      Vercel auto-redeployed within about a minute and the real landing page came up correctly.
- [x] 🟡 **Full live journey run end-to-end on the deployed site itself**, not localhost: signed up
      a real (throwaway) academy, created a course, pasted study material, generated real AI
      questions via a live Gemini call (the org's key inserted pre-encrypted directly into the
      database with the same `encrypt()` the app itself uses — never typed into the Settings form,
      same standing practice as Phase H), approved and published, signed up a student with the
      real invite code, approved that enrollment as the admin, then drove the actual attempt via
      the deployed API routes end-to-end — confirmed `is_correct`/`correct_option` never appear in
      any response the same way they don't on localhost, confirmed the adaptive ladder climbed
      easy → medium → hard exactly as designed, scored 100%, and a certificate issued and rendered
      correctly on the public `/verify/[code]` page. One real automation-only snag along the way:
      a property-descriptor-setter fill on the content-upload `<textarea>` silently failed to
      update React's controlled state on this production build (character counter stayed at 0)
      even though the DOM visibly showed the pasted text — switched to real simulated keystrokes for
      that one field and it worked correctly; not a product bug, an artifact of the test technique.
      All test data (org, course, quiz, questions, attempt, certificate, both accounts) deleted
      from the live database afterward.
- [ ] 🟡 Phone check over real mobile data, both themes — this one needs an actual phone, so it's
      yours to do (or tell me and I'll walk you through what to look for).

---

## Phase R — Automated safety net ✅

Full detail in **`docs/TESTING.md`**. In short: `npm test` runs 74 unit and database-security
tests in about twenty seconds, `npm run test:e2e` drives a real browser through the whole student
journey, and GitHub Actions runs all of it plus the types, the linter and the build on every push.

The database tests are the important ones. They create two throwaway academies against the real
Supabase project, sign in as real users, and ask the database directly for what those users must
not have — another academy's courses, students or API key; a student promoting themselves, forging
a score or approving their own enrollment; an owner upgrading their own plan. This project had
already been bitten twice by policies that scoped correctly to the organization but forgot to check
the role, and nothing in the repository would have caught a third.

**Real defects these tests found, all fixed:**

1. **Every button without an explicit `type` was disabled until the page's JavaScript finished
   loading.** The Phase I hydration guard treated "no type" as "submit", which swept in Start Quiz,
   Next Question and every modal action. Now untyped buttons render as `type="button"` — the hazard
   is removed rather than guarded against — and only a real submit button waits.
2. **A student whose time ran out while reading a question was stranded.** The server correctly
   refused the answer; the browser showed a red toast and left them on that question with no route
   to their result. `submit-answer` now returns a machine-readable `reason`, and the quiz screen
   finalizes and moves them to the result page.
3. **Three colours failed the 4.5:1 contrast rule this project sets for itself** — `--fg-muted`,
   `--success` and `--warning` — and gold `#F4A300`, a 2.1:1 fill colour, was being used for link
   text in 42 places. Links are spruce now, which is what `docs/DESIGN-SYSTEM.md` said all along.
   Inline links inside paragraphs are underlined, since spruce alone was only 1.27:1 away from the
   body text around it.

---

## Known limits — real, not bugs

Same three as `CLAUDE.md`: Resend only reaches Talha's own address until a domain is bought;
Vercel functions die at 60s so generation must stay chunked; Supabase free tier pauses after 7
days idle — check before every demo.

## Phase S — Systematic sweep ✅

The safety net in Phase R proved the rules the project already knew about. This phase went looking
for the ones nobody had checked. Everything found is fixed and covered by a test that would catch it
coming back. Full operational notes are in **`docs/OPERATIONS.md`**.

**Security and privacy**

- **Certificate numbers were guessable.** Five random digits meant the whole year's certificates,
  across every academy, could be listed by trying `QZ-<year>-00000` upward — each one a public page
  showing a student's full name, score, course and academy. They are now ten characters drawn from
  the cryptographic random source. This also removed a collision problem: five digits started
  colliding with the UNIQUE constraint after a few hundred certificates, and a student whose three
  insert attempts all collided received no certificate and no error.
- **Invite codes came from `Math.random()`.** An invite code lets a stranger join an academy, so it
  is a key and now comes from the same cryptographic source, with even distribution across the
  alphabet.
- **Uploaded material could give the AI orders.** Content goes straight into the generation prompt.
  Its triple-quote fence is now neutralised so material cannot close its own quotes, and the prompt
  states outright that anything inside the fence is study material even when phrased as a command.

**Honesty about failure**

- **Every list page treated "the database said no" as "you have nothing yet."** A Supabase query
  that fails returns null, and the code did `data ?? []`. An owner whose free-tier database had
  been paused was told "No courses yet. Create your first course." Seven pages now show a distinct
  `LoadFailed` state instead.
- **Nothing was logged when anything failed.** Six server-side failure points now write one
  `[quizo]` line to Vercel's Runtime Logs, with ids but never answers, emails or keys.
- **A root-layout crash showed Next.js's unstyled error page.** `global-error.tsx` now covers it.

**Resilience**

- Gemini calls are capped at 45 seconds and a retry only starts with real time left, so a slow AI
  returns a plain-English message instead of being killed by Vercel's 60-second ceiling.

**Accessibility and phones**

- Dark-mode muted text and dark-mode spruce both failed the project's own 4.5:1 contrast rule on
  raised surfaces. Both tokens were corrected.
- Two quiz filter dropdowns had no accessible name.
- `/dashboard/courses` scrolled sideways on a 375px screen: the admin shell's content column was
  missing `min-w-0`, so a wide table stretched the whole page instead of scrolling inside its own
  box.

**Checked and found correct** — every plan limit is enforced where it is claimed; every pricing
bullet maps to code that exists; RLS on `certificates` allows only the owner and their academy's
admins, with the public verification page deliberately using the service client; the quiz screen
already retries a dropped connection and the server already owns the clock.
