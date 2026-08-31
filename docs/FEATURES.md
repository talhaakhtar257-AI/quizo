# Quizo — Feature Specifications

> Detailed specs for every feature. Reference this when building each phase.

---

## 1. Authentication & Authorization

### Signup Flow (Admin)
1. Admin visits `/signup`
2. Fills form: full name, email, password, academy name
3. System creates:
   - Supabase auth user with `role: admin` in `app_metadata`
   - New `organizations` row
   - New `profiles` row with `role: admin`
   - New `organization_settings` row (empty)
   - Sets `organization_id` in JWT `app_metadata`
4. Redirects to `/dashboard`

### Signup Flow (Student)
1. Student visits `/signup/student` (or `/signup` with invite code)
2. Fills form: full name, email, password, invite code
3. System validates:
   - Invite code exists AND is active AND not expired AND not at capacity
4. System creates:
   - Supabase auth user with `role: student` in `app_metadata`
   - Sets `organization_id` from the invite code's org
   - New `profiles` row with `role: student`
   - New `enrollments` row with `status: pending`
5. Redirects to `/student` (shows "pending approval" state)

### Login Flow
1. User enters email + password at `/login`
2. Supabase Auth validates credentials
3. Check role in JWT:
   - `admin` or `sub_admin` → redirect `/dashboard`
   - `student` → redirect `/student`
4. Middleware blocks wrong roles from wrong routes

### Session Management
- Supabase handles session refresh automatically
- Server-side: use `createServerClient` from `@supabase/ssr`
- Client-side: use `createBrowserClient` from `@supabase/ssr`
- Middleware refreshes session on every request

---

## 2. Course Management

### Create Course
**Who:** Admin, Sub-admin (with `create_course` permission)
**Limits:** Free = max 3 courses, Pro/Institution = unlimited

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Name | text | Yes | 3-100 characters |
| Description | textarea | No | Max 500 characters |
| Subject | text | No | Max 50 characters |
| Invite code expiry | date | Yes | Must be future date, default +30 days |

**On create:**
- Generate random 8-character invite code (uppercase alphanumeric, no ambiguous chars: 0/O, 1/I/L)
- Create `courses` row
- Create `invite_codes` row
- `max_students` set by plan (25/100/500)

### Invite Code Mechanics
- Format: `XXXX-XXXX` (e.g., `AB3F-K9YZ`)
- Auto-expires on set date
- Admin can regenerate (old code deactivated, new code created)
- Admin CANNOT increase max_uses on Free plan
- Used count increments on each enrollment request (not on approval)
- Students see: "Invalid code", "Code expired", "Course is full" — never reveal which

### Course Status
| Status | Meaning |
|--------|---------|
| `active` | Students can enroll and take quizzes |
| `archived` | Hidden from students, data preserved |

---

## 3. Enrollment System

### Flow
```
Student enters invite code
    → Validate code (active, not expired, has capacity)
    → Create enrollment (status: PENDING)
    → Admin sees in "Pending" tab
    → Admin clicks Approve or Reject
    → APPROVED: student gains access + gets email
    → REJECTED: student notified + gets email with reason
```

### Enrollment States
| Status | Student sees | Can take quizzes |
|--------|-------------|-----------------|
| `pending` | "Waiting for approval" banner | No |
| `approved` | Full course access | Yes |
| `rejected` | "Your request was declined" | No |

### Admin Enrollment View
- Table with columns: Student Name, Email, Requested Date, Status, Actions
- Bulk approve/reject for multiple students
- Filter by status
- Sort by date

---

## 4. AI Quiz Generation

### Prompt Structure
```
You are an expert educator creating quiz questions.

Topic: {topic}
Course: {course_name}
Difficulty distribution: {easy_count} easy, {medium_count} medium, {hard_count} hard
Total questions: {total}

Generate exactly {total} multiple-choice questions.

For each question provide:
1. The question text
2. Four answer options (A, B, C, D)
3. The correct option letter
4. A brief explanation of why the answer is correct
5. The difficulty level (easy/medium/hard)

Rules:
- Questions must be factually accurate
- All four options must be plausible
- Only one option can be correct
- Easy: recall and basic understanding
- Medium: application and analysis
- Hard: synthesis, evaluation, edge cases
- No trick questions
- Clear, unambiguous language

Return as JSON array:
[{
  "question": "...",
  "options": { "a": "...", "b": "...", "c": "...", "d": "..." },
  "correct": "a",
  "explanation": "...",
  "difficulty": "easy"
}]
```

### Pool Generation
| Plan | Questions to Show | Pool Generated | Pool Multiplier |
|------|-------------------|----------------|-----------------|
| Free | N | N (same) | 1x |
| Pro | N | N × 3 | 3x (equal split: N easy + N medium + N hard) |
| Institution | N | N × 3 | 3x |

### Daily Limit Enforcement
```
Before generating:
  1. Get plan from organizations table
  2. Get limit from plan_limits table
  3. Count today's usage: SELECT SUM(questions_generated) 
     FROM ai_usage_log WHERE course_id = X AND date = today
  4. If usage + questions_to_show > limit → reject with message
  5. Else → generate and log
```

### Admin Preview & Edit
After AI generates questions, admin sees a preview:
- Each question in an editable card
- Can edit question text, options, correct answer
- Can delete individual questions
- Can manually add a question
- Can regenerate single question (costs 1 against daily limit)
- Must click "Save as Draft" to store

---

## 5. Quiz Lifecycle

```
             ┌──────────┐
             │  DRAFT   │ ← Admin creates/edits
             └────┬─────┘
                  │ Submit for review
                  ▼
          ┌──────────────┐
          │  IN_REVIEW   │ ← Waiting for super admin
          └──┬────────┬──┘
             │        │
    Approve  │        │ Reject (with comment)
             ▼        ▼
     ┌───────────┐  ┌──────────┐
     │ PUBLISHED │  │ REJECTED │ → Admin edits → back to DRAFT
     └─────┬─────┘  └──────────┘
           │ Archive
           ▼
     ┌──────────┐
     │ ARCHIVED │ → Can be unarchived back to PUBLISHED
     └──────────┘
```

**Special case — solo admin (no sub-admins):**
When the person creating the quiz IS the super admin and there are no sub-admins, the quiz can go directly from DRAFT → PUBLISHED (skip IN_REVIEW).

---

## 6. Quiz Player

### Pre-Quiz Screen
- Quiz title and topic
- Number of questions
- Time limit
- Attempt number (e.g., "Attempt 2 of 3")
- Best score so far (if retry)
- Rules reminder (no tab switching, etc.)
- "Start Quiz" button

### During Quiz
- One question at a time (full card, centered)
- 4 options as clickable cards (radio behavior). Keys 1–4 select, Enter submits
- Navigation: **Next Question only**. No Previous. No skip. No flag.
- Progress: "Question 5 of 10" + progress bar
- Timer: countdown in top bar, server-owned
- `DifficultyIndicator` shows the current level

> **Why there is no Back button.** The server picks each question *after* seeing the previous
> answer. A Previous button would mean the whole question set was chosen before the student
> answered anything — which is exactly what makes adaptive difficulty impossible. Adaptive is the
> product's headline feature, so the one-at-a-time flow is not negotiable.

### Question Selection (Per Attempt)

**Every plan uses the same adaptive engine.** Plans differ by **pool size**, not by player.

```
Start at EASY

  correct  →  easy → medium → hard → hard (ceiling)
  wrong    →  hard → medium → easy → easy (floor)

Pick: random approved question from the current difficulty level
Never repeat a question within the same attempt
Record difficulty_at_time on every answer
```

The ladder moves on **every** answer, not after a streak. With a 10-question quiz, a rule
requiring 3 correct in a row to climb would need 6 correct answers before the first Hard
question — most students would never see one.

**Pool exhaustion fallback:** Easy→Medium, Hard→Medium, Medium→Easy then Hard. If nothing
remains at any level, submit early and tell the student why.

**Locked modes:** if `difficulty_mode` is `easy_only` / `medium_only` / `hard_only`, the level
never changes and the attempt starts at that level.

| Plan | Questions shown | Pool generated | Effect on retakes |
|------|-----------------|----------------|-------------------|
| Free | N | N (1×) | Same question set, drawn in a different order |
| Pro | N | N × 3 | Fresh draw each attempt — feels like a new quiz |
| Institution | N | N × 3 | Fresh draw each attempt |

### Answer Submission

Answers are graded **one at a time, as they are given** — not in a batch at the end.

**Per answer** (`/api/quiz/submit-answer`):
1. Server verifies the attempt belongs to this student and is still `in_progress`
2. Server checks correctness against `pool_questions.correct_option` — **never the browser**
3. Server writes `attempt_answers` with `is_correct` and `difficulty_at_time`
4. Server moves the ladder and increments `questions_answered`
5. Server recomputes `time_remaining_seconds` from its own clock
6. Server returns **only** whether to continue and the new count — **never whether the answer
   was correct.** Revealing it mid-quiz would let a student infer the answer key by retrying.

**On finish** (`/api/quiz/submit`), triggered by the last question, the timer hitting zero, or
pool exhaustion:
1. Score = correct answers ÷ questions answered × 100, to one decimal
2. Compare with the quiz's `passing_score`
3. Set `status = submitted`, write `submitted_at` and `time_taken_seconds`
4. Recompute `is_best_attempt` across this student's attempts for this quiz (ties keep the earlier)
5. If passed and no certificate exists yet for this student+quiz, issue one
6. Only **now** return the full review: every question, the chosen option, the correct option,
   and the explanation

A submitted attempt is immutable. A second answer for the same `(attempt_id, question_id)` is
rejected with 409.

### Timer Enforcement
- Client displays countdown (for UX)
- Server tracks `started_at` + `time_limit_minutes`
- If server receives submission after time limit: reject OR auto-submit what's answered
- Client auto-submits at 0:00

---

## 7. Anti-Cheating Features

### Always Active (Free + Pro)
| Feature | Implementation | Student sees |
|---------|---------------|-------------|
| Question shuffle | Different order per attempt | Nothing (invisible) |
| Option shuffle | A/B/C/D randomized per attempt | Nothing (invisible) |
| Tab switch detection | `visibilitychange` event | Warning toast + counter shown |

### Pro Only
| Feature | Implementation | Student sees |
|---------|---------------|-------------|
| Fullscreen lock | `requestFullscreen()` on start | "Press F11 to exit" hidden |
| Response-time flag | Track seconds per question | Nothing (admin sees flags) |
| Copy/paste disable | Prevent clipboard events | "Copying is disabled" message |
| Event stream log | All events → `quiz_event_stream` | Nothing (admin sees report) |

### Admin Anti-Cheat Report
Per student, per attempt:
- Total tab switches (count)
- Fullscreen exits (count)
- Fast answers (count, <2 seconds)
- Copy/paste attempts (count)
- Integrity score: calculated as `100 - (violations × weight)`
  - Tab switch: -5 per occurrence
  - Fullscreen exit: -10 per occurrence
  - Fast answer: -3 per occurrence
  - Copy attempt: -5 per occurrence
- Flag threshold: integrity score < 70 → show warning icon

---

## 8. Scoring System

### Score Calculation
```
score = (correct_answers / total_questions) × 100
```

### Best of N
- System tracks all attempts
- `is_best_attempt` flag on the highest-scoring attempt
- Dashboard shows: best score (prominent) + all attempt scores (detail)
- If two attempts tie: the earlier one keeps `is_best_attempt`

### Grading Scale (Display Only)
| Score | Grade | Color |
|-------|-------|-------|
| 90-100% | A+ | Success green |
| 80-89% | A | Success green |
| 70-79% | B | Gold |
| 60-69% | C | Warning amber |
| 50-59% | D | Error light |
| 0-49% | F | Error red |

### Certificate Threshold
- Default: 70% (configurable per quiz by admin)
- Certificate auto-generated on first passing attempt
- Only one certificate per student per quiz (first pass)

---

## 9. Analytics

### Course Analytics (Admin)
| Metric | Chart Type | Data Source |
|--------|-----------|-------------|
| Average score per quiz | Bar chart | quiz_attempts (AVG score) |
| Pass rate per quiz | Donut chart | quiz_attempts (% above threshold) |
| Score distribution | Histogram | quiz_attempts (bucketed scores) |
| Completion rate | Progress bar | enrollments vs quiz_attempts |
| Scores over time | Line chart | quiz_attempts (by date) |

### Student Analytics (Admin, per student)
| Metric | Display |
|--------|---------|
| All quiz scores | Table with attempt history |
| Strengths | Topics with highest average |
| Weaknesses | Topics with lowest average |
| Attempt patterns | Average attempts before passing |
| Time analysis | Average time per quiz |

### Question Analytics (Admin)
| Metric | Display |
|--------|---------|
| Difficulty actual vs assigned | Compare: was "easy" actually easy? |
| Correct percentage per question | Ranked list |
| Most skipped | Ranked list |
| Average time per question | Ranked list |
| Distractor effectiveness | Which wrong options were chosen most |

---

## 10. Email Templates

### Template: enrollment-approved
```
Subject: You're in! Welcome to "{course_name}"
Body:
  Hi {student_name},
  
  Your enrollment in "{course_name}" at {academy_name} has been approved!
  
  You can now access all quizzes and course materials.
  
  [Open Course →] (link)
```

### Template: enrollment-rejected
```
Subject: Update on your enrollment request
Body:
  Hi {student_name},
  
  Your enrollment request for "{course_name}" at {academy_name} 
  was not approved at this time.
  
  {rejection_reason if provided}
  
  If you have questions, contact your instructor.
```

### Template: quiz-published
```
Subject: New Quiz Available: "{quiz_title}"
Body:
  Hi {student_name},
  
  A new quiz is available in "{course_name}":
  
  📝 {quiz_title}
  📊 {question_count} questions
  ⏱️ {time_limit} minutes
  🔄 {max_attempts} attempts allowed
  
  [Take Quiz →] (link)
```

### Template: certificate-earned
```
Subject: Congratulations! You earned a certificate
Body:
  Hi {student_name},
  
  You passed "{quiz_title}" with a score of {score}%!
  
  Your certificate number: {certificate_number}
  
  [Download Certificate →] (link)
```

---

## 11. Plans & Limits

### Enforcement Points
| Action | Check | Limit Source |
|--------|-------|-------------|
| Create course | COUNT courses WHERE org = X | plan_limits.max_courses |
| Student enrolls | COUNT enrollments WHERE course = X AND status IN (pending, approved) | plan_limits.max_students_per_course |
| Generate quiz | SUM questions_generated WHERE course = X AND date = today | plan_limits.max_ai_questions_per_day |
| Start attempt | COUNT attempts WHERE quiz = X AND student = Y | plan_limits.max_quiz_attempts |
| Add sub-admin | COUNT sub_admin_permissions WHERE org = X | plan_limits.max_sub_admins |
| Use anti-cheat | Check plan | plan_limits.has_anti_cheat_full |
| Custom branding | Check plan | plan_limits.has_custom_branding |

### Upgrade Prompt UX
When a limit is hit, show:
```
┌──────────────────────────────────┐
│ ⭐ Upgrade to Pro                │
│                                  │
│ You've reached the Free plan     │
│ limit of 3 courses.              │
│                                  │
│ Upgrade to Pro for unlimited     │
│ courses, 100 students/course,    │
│ and full anti-cheating.          │
│                                  │
│ [Upgrade — $19/month]  [Maybe Later] │
└──────────────────────────────────┘
```

---

## 12. Sub-Admin System

### Invite Flow
1. Super admin enters email in Settings → Sub-Admins
2. System sends invite email with signup link
3. Sub-admin signs up → auto-linked to organization
4. Default: all permissions OFF (super admin must enable)
5. Super admin toggles permissions in the matrix

### Permission Matrix UI
```
                       Sub-Admin 1    Sub-Admin 2
Create Course            [✓]            [ ]
Edit Course              [✓]            [✓]
Delete Course            [ ]            [ ]
Create Quiz              [✓]            [✓]
Approve Quiz             [ ]            [ ]
View Students            [✓]            [✓]
Manage Enrollments       [✓]            [ ]
View Analytics           [✓]            [✓]
Manage Settings          [ ]            [ ]
```

### Permission Check (Server-Side)
```typescript
async function checkPermission(userId: string, permission: string): Promise<boolean> {
  const { data } = await supabase
    .from('sub_admin_permissions')
    .select(permission)
    .eq('user_id', userId)
    .eq('organization_id', currentOrg())
    .single()
  
  return data?.[permission] ?? false
}
```
