# Database Schema

Supabase (PostgreSQL). 11 tables. UUID primary keys, `created_at timestamptz default now()` everywhere.

---

## Relationships

```
auth.users ──1:1── profiles
                      │
                      ├──< courses ──< course_outlines
                      │        │
                      │        ├──< content_uploads
                      │        │
                      │        └──< quizzes ──< questions ──< options
                      │                  │
                      │                  └──< quiz_assignments
                      │
                      └──< attempts ──< attempt_answers
                              │
                              └──1:1── certificates
```

---

## 1. `profiles`

Extends Supabase Auth. Created automatically by trigger on signup.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users.id` |
| `full_name` | text | |
| `email` | text | |
| `role` | enum | `admin` \| `user` — default `user` |
| `status` | enum | `pending` \| `active` \| `rejected` — **default `pending`** |
| `avatar_url` | text | nullable |
| `rejection_reason` | text | nullable — optional note an admin leaves when rejecting a signup |

**Trigger required:** on insert into `auth.users`, create a matching `profiles` row with `status = 'pending'`, `role = 'user'`.

The first admin is promoted **by hand** in the Supabase Table Editor — there is no bootstrap UI.

---

## 2. `courses`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | required |
| `description` | text | nullable |
| `created_by` | uuid | FK → `profiles.id` |
| `is_active` | boolean | default true |

---

## 3. `course_outlines`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid | FK → `courses.id` on delete cascade |
| `topic_title` | text | required |
| `topic_description` | text | nullable |
| `topic_order` | integer | drives Up/Down reordering |

---

## 4. `content_uploads`

The raw study material the admin supplied.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid | FK → `courses.id` |
| `source_type` | enum | `text` \| `image` |
| `raw_text` | text | for images, this is the **admin-corrected** OCR output |
| `original_filename` | text | nullable |
| `uploaded_by` | uuid | FK → `profiles.id` |

> OCR output is always editable before saving. Tesseract is never perfect; what is stored is what the admin approved.

---

## 5. `quizzes`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid | FK → `courses.id` |
| `title` | text | required |
| `description` | text | nullable |
| `timer_minutes` | integer | 1–300, default 30 |
| `passing_percent` | integer | 1–100, **default 70** — per quiz, not global |
| `questions_to_show` | integer | how many the student answers |
| `difficulty_mode` | enum | `adaptive` \| `easy_only` \| `medium_only` \| `hard_only` — default `adaptive` |
| `max_attempts` | integer | default 1, `0` = unlimited |
| `is_published` | boolean | default false |
| `created_by` | uuid | FK → `profiles.id` |

### Publish guard

`is_published` may only become true when enough **approved** questions exist:

- `adaptive` → ≥ `questions_to_show` approved questions at **each** of the three levels
- single-level mode → ≥ `questions_to_show` approved at **that** level

Block otherwise and state exactly what is missing.

---

## 6. `questions`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `quiz_id` | uuid | FK → `quizzes.id` on delete cascade |
| `difficulty` | enum | `easy` \| `medium` \| `hard` |
| `question_type` | enum | `mcq` \| `scenario` |
| `scenario_text` | text | nullable — the 2–4 sentence situation |
| `question_text` | text | required |
| `explanation` | text | why the correct answer is correct |
| `is_approved` | boolean | **default false** for AI, true for manual |
| `generated_by_ai` | boolean | |

> Only `is_approved = true` questions may ever be served to a student.

---

## 7. `options`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid | FK → `questions.id` on delete cascade |
| `option_text` | text | required |
| `is_correct` | boolean | ⚠️ **must be stripped from every pre-submission API response** |
| `option_order` | integer | |

Exactly four rows per question. Exactly one with `is_correct = true`.

---

## 8. `quiz_assignments`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `quiz_id` | uuid | FK → `quizzes.id` |
| `user_id` | uuid | FK → `profiles.id` |
| `assigned_by` | uuid | FK → `profiles.id` |
| `deadline` | timestamptz | nullable |
| `assigned_at` | timestamptz | |

**Unique constraint on `(quiz_id, user_id)`** — the same quiz cannot be assigned twice.

Only `status = 'active'` users may be assigned.

---

## 9. `attempts`

One row per sitting.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `quiz_id` | uuid | FK → `quizzes.id` |
| `user_id` | uuid | FK → `profiles.id` |
| `attempt_number` | integer | 1, 2, 3… |
| `started_at` | timestamptz | |
| `submitted_at` | timestamptz | nullable |
| `status` | enum | `in_progress` \| `submitted` \| `expired` |
| `score` | integer | count correct |
| `total_questions` | integer | |
| `percentage` | numeric(5,1) | one decimal |
| `passed` | boolean | |
| `current_difficulty` | enum | default `easy` — **the ladder position** |
| `time_remaining_seconds` | integer | **server-owned** |
| `questions_answered` | integer | |

> `current_difficulty` and `time_remaining_seconds` are what make **resume** possible. Without them, a student who closes the browser restarts from zero.
>
> `time_remaining_seconds` is written from the **server clock** on every answer and every 30-second heartbeat. A value sent by the browser is a hint, never authoritative.

**Index:** `(user_id, quiz_id)`

---

## 10. `attempt_answers`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `attempt_id` | uuid | FK → `attempts.id` on delete cascade |
| `question_id` | uuid | FK → `questions.id` |
| `selected_option_id` | uuid | FK → `options.id` |
| `is_correct` | boolean | decided **server-side** |
| `difficulty_at_time` | enum | the level when the question was served |
| `question_order` | integer | 1st, 2nd, 3rd… in this attempt |
| `answered_at` | timestamptz | |

> **`difficulty_at_time` is not optional.** It answers the question no total score can: *how far up the ladder did this student climb?* A student who reached Hard four times is stronger than one who stayed on Easy with the same score. It also powers the difficulty-separation chart that proves the AI is producing genuinely distinct levels.

Reject a second answer for the same `(attempt_id, question_id)`.

---

## 11. `certificates`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `attempt_id` | uuid | FK → `attempts.id` |
| `user_id` | uuid | FK → `profiles.id` |
| `certificate_code` | text UNIQUE | `CERT-YYYY-XXXXXX` |
| `issued_at` | timestamptz | |

Created automatically at submission when `percentage >= quizzes.passing_percent`. Never on fail.

---

## Row Level Security

**Enable RLS on all 11 tables.** No exceptions.

| Table | Student may | Admin may |
|---|---|---|
| `profiles` | read + update **own row only** | all |
| `courses` | read | all |
| `course_outlines` | read | all |
| `content_uploads` | — | all |
| `quizzes` | read only if **assigned to them AND published** | all |
| `questions` | read only via the server API, only `is_approved` | all |
| `options` | **never read `is_correct` directly** | all |
| `quiz_assignments` | read own rows | all |
| `attempts` | read + insert **own only**; never update a submitted row | all |
| `attempt_answers` | read own; insert only for own in-progress attempt | all |
| `certificates` | read own | all |

Insert / update / delete on `courses`, `course_outlines`, `quizzes`, `questions`, `options` is **admin only**.

**`profiles` column guard:** the "update own row" policy above is row-level, not column-level — Postgres RLS can't stop a student from editing their own row's `status`, `role`, or `rejection_reason` columns just because it's *their* row. A `BEFORE UPDATE` trigger (`profiles_prevent_self_privilege_escalation`) closes that gap: it blocks any change to those three columns unless the caller is an admin, but only for requests that arrive as a real logged-in session (`auth.uid()` is set) — direct database access (SQL editor, MCP, migrations) is a different, already-trusted boundary and is left alone.

---

## Indexes

- Every foreign key column
- `attempts (user_id, quiz_id)`
- `questions (quiz_id, difficulty, is_approved)` — the adaptive pool query runs on every question
- `attempt_answers (attempt_id)`

---

## Free-tier limits

| Limit | Value | If approaching |
|---|---|---|
| Database size | 500 MB | Delete old test attempts and unapproved questions |
| Idle pause | **7 days** | Open the Supabase dashboard and Restore. **Always check this before a demo.** |
