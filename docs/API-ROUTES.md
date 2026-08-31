# Quizo — API Routes

> All API routes run server-side. All require authentication unless marked PUBLIC.
> Every response follows the shape: `{ data, error, message }`

---

## Authentication

### POST `/api/auth/signup`
**Access:** PUBLIC
**Body:**
```json
{
  "email": "admin@academy.com",
  "password": "securepass123",
  "full_name": "Ahmed Khan",
  "academy_name": "Khan Academy Prep",
  "role": "admin"
}
```
**Response:** `{ data: { user, organization, session } }`
**Side effects:** Creates auth user, organization, profile, organization_settings

### POST `/api/auth/signup/student`
**Access:** PUBLIC
**Body:**
```json
{
  "email": "student@email.com",
  "password": "securepass123",
  "full_name": "Sara Ahmed",
  "invite_code": "AB3F-K9YZ"
}
```
**Validates:** Code exists, active, not expired, not at capacity
**Response:** `{ data: { user, enrollment } }`
**Side effects:** Creates auth user, profile, enrollment (status: pending)

---

## Courses

### GET `/api/courses`
**Access:** Admin (own org only via RLS)
**Query:** `?status=active&page=1&limit=10`
**Response:** `{ data: [Course], total, page }`

### POST `/api/courses`
**Access:** Admin (with `create_course` permission)
**Body:**
```json
{
  "name": "Web Development 101",
  "description": "Learn HTML, CSS, JavaScript",
  "subject": "Computer Science",
  "invite_code_expiry_days": 30
}
```
**Validates:** Plan course limit not exceeded
**Response:** `{ data: { course, invite_code } }`

### PATCH `/api/courses/[id]`
**Access:** Admin (with `edit_course` permission)
**Body:** Partial course fields
**Response:** `{ data: Course }`

### DELETE `/api/courses/[id]`
**Access:** Admin (with `delete_course` permission)
**Validates:** No active enrollments (must archive first)
**Response:** `{ data: { deleted: true } }`

### POST `/api/courses/[id]/regenerate-code`
**Access:** Admin
**Response:** `{ data: { new_code, expires_at } }`
**Side effects:** Deactivates old code, creates new one

---

## Enrollments

### GET `/api/courses/[id]/enrollments`
**Access:** Admin
**Query:** `?status=pending&page=1`
**Response:** `{ data: [Enrollment with student profile] }`

### PATCH `/api/enrollments/[id]/approve`
**Access:** Admin (with `manage_enrollments` permission)
**Response:** `{ data: { enrollment, email_sent } }`
**Side effects:** Updates status, sends approval email via Resend

### PATCH `/api/enrollments/[id]/reject`
**Access:** Admin (with `manage_enrollments` permission)
**Body:** `{ "reason": "Optional rejection reason" }`
**Response:** `{ data: { enrollment, email_sent } }`
**Side effects:** Updates status, sends rejection email

### POST `/api/enrollments/bulk-approve`
**Access:** Admin
**Body:** `{ "enrollment_ids": ["uuid1", "uuid2"] }`
**Response:** `{ data: { approved: 5, emails_sent: 5 } }`

---

## Quiz Generation

### POST `/api/quiz/generate`
**Access:** Admin
**Body:**
```json
{
  "course_id": "uuid",
  "title": "JavaScript Basics Quiz",
  "topic": "Variables, data types, operators in JavaScript",
  "questions_to_show": 10,
  "time_limit_minutes": 30,
  "max_attempts": 3,
  "passing_score": 70
}
```
**Validates:**
- Daily AI limit not exceeded for this course
- Admin's Gemini API key exists and is valid
- Plan limits (pool multiplier applied: 1x Free, 3x Pro)

**Flow:**
1. Decrypt admin's Gemini API key
2. Build prompt with question count × pool multiplier
3. Call Gemini API
4. Parse and validate response
5. Save quiz (status: draft) + pool + questions
6. Log AI usage

**Response:**
```json
{
  "data": {
    "quiz_id": "uuid",
    "questions": [
      {
        "id": "uuid",
        "question_text": "What is the output of typeof null?",
        "options": { "a": "null", "b": "object", "c": "undefined", "d": "string" },
        "correct_option": "b",
        "explanation": "typeof null returns 'object' due to a legacy JavaScript bug",
        "difficulty": "medium"
      }
    ],
    "daily_remaining": 5
  }
}
```

### PATCH `/api/quiz/[id]`
**Access:** Admin
**Body:** Updated quiz fields or individual question edits
**Validates:** Quiz is in DRAFT status (can't edit published)

### POST `/api/quiz/[id]/submit-review`
**Access:** Admin
**Validates:** Quiz has at least 1 question, is in DRAFT status
**Side effects:** Status → IN_REVIEW

### POST `/api/quiz/[id]/approve`
**Access:** Super Admin only (or sole admin with no sub-admins)
**Side effects:** Status → PUBLISHED, sends email to all enrolled students

### POST `/api/quiz/[id]/reject`
**Access:** Super Admin only
**Body:** `{ "comment": "Questions 3 and 7 are ambiguous" }`
**Side effects:** Status → REJECTED

### POST `/api/quiz/[id]/archive`
**Access:** Admin
**Side effects:** Status → ARCHIVED (hidden from students)

---

## Quiz Player (Student-Facing)

### GET `/api/student/quiz/[id]`
**Access:** Student (enrolled + approved in the quiz's course)
**Response:**
```json
{
  "data": {
    "quiz": {
      "id": "uuid",
      "title": "JavaScript Basics",
      "topic": "Variables and Data Types",
      "questions_to_show": 10,
      "time_limit_minutes": 30,
      "max_attempts": 3,
      "passing_score": 70
    },
    "attempts_used": 1,
    "best_score": 70.00,
    "can_attempt": true
  }
}
```
**Note:** Does NOT return questions. Questions come from start-attempt.

> **The player is one question at a time for every plan.** The server picks each question after
> seeing the previous answer — that is what "adaptive" means. Free and Pro use the identical
> engine and identical routes below; they differ only in pool size (§4 of `FEATURES.md`), which
> changes how many distinct questions `next-question` has to draw from, not the shape of any
> response.

### POST `/api/student/quiz/[id]/start`
**Access:** Student
**Validates:**
- Student has attempts remaining
- No in-progress attempt exists — if one does, return it instead (resume, not a new attempt)
- Quiz is PUBLISHED, deadline (if any) not passed, enough approved questions exist per level
**Flow:**
1. Create `quiz_attempts` row: `status: in_progress`, `current_difficulty: easy` (or the quiz's
   single level, if `difficulty_mode` is locked), full `time_remaining_seconds`
2. Does **not** select or return any question — that is `next-question`'s job

**Response:**
```json
{
  "data": {
    "attempt_id": "uuid",
    "attempt_number": 2,
    "questions_to_show": 10,
    "started_at": "2026-08-29T10:00:00Z",
    "time_remaining_seconds": 1800
  }
}
```

### POST `/api/student/quiz/[id]/next-question`
**Access:** Student
**Body:** `{ "attempt_id": "uuid" }`
**Validates:** attempt belongs to this student, is `in_progress`

**Flow:**
1. Recompute `time_remaining_seconds` from the server clock (`started_at`, never a stored
   counter) — if ≤ 0, auto-submit and return `"time expired"`
2. If `questions_answered` has reached `questions_to_show`, auto-submit and return
   `"quiz complete"`
3. Pick a random **approved** question from `current_difficulty` not already used in this attempt
4. If that pool is empty, fall back per the order in `FEATURES.md` §6 (Easy→Medium, Hard→Medium,
   Medium→Easy then Hard); if nothing remains anywhere, auto-submit early and say why
5. Shuffle the 4 options
6. Return the question **with `correct_option` completely stripped**

**Response:**
```json
{
  "data": {
    "question_id": "uuid",
    "question_text": "What keyword declares a constant?",
    "options": [
      { "key": "a", "text": "let" },
      { "key": "b", "text": "define" },
      { "key": "c", "text": "const" },
      { "key": "d", "text": "var" }
    ],
    "difficulty": "easy",
    "question_number": 3,
    "questions_to_show": 10,
    "time_remaining_seconds": 1620
  }
}
```

### POST `/api/student/quiz/[id]/submit-answer`
**Access:** Student
**Body:**
```json
{
  "attempt_id": "uuid",
  "question_id": "uuid",
  "selected_option": "c",
  "time_spent_seconds": 15
}
```
**Validates:**
- Attempt belongs to this student and is `in_progress`
- This `(attempt_id, question_id)` has not already been answered — reject a second answer, 409

**Flow:**
1. Check correctness against `pool_questions.correct_option` — **server-side only**
2. Insert `attempt_answers` with `is_correct` and `difficulty_at_time`
3. Move the ladder: correct → easy→medium→hard→hard (ceiling); wrong → hard→medium→easy→easy
   (floor). If `difficulty_mode` is a single level, do not change it.
4. Increment `questions_answered`; recompute `time_remaining_seconds` from the server clock

**Response — never reveals whether the answer was correct:**
```json
{
  "data": {
    "continue": true,
    "questions_answered": 4,
    "time_remaining_seconds": 1595
  }
}
```

### POST `/api/student/quiz/[id]/submit`
**Access:** Student
**Body:** `{ "attempt_id": "uuid" }`
**Called automatically** by the client on the last question, at 0:00, or when
`next-question`/`submit-answer` returns `"quiz complete"` or a pool-exhaustion early-submit.

**Validates:** attempt belongs to this student, is `in_progress`

**Flow:**
1. Score = correct ÷ questions answered × 100, to one decimal
2. Update attempt: `status: submitted`, `submitted_at`, `time_taken_seconds`, `score`
3. Recompute `is_best_attempt` across this student's attempts for this quiz (ties keep the earlier)
4. If `score >= passing_score` and no certificate exists yet for this student+quiz, issue one
5. **Only now** return the full per-question review with correct answers and explanations

**Response:**
```json
{
  "data": {
    "score": 80.0,
    "total_correct": 8,
    "total_questions": 10,
    "is_best": true,
    "passed": true,
    "certificate_id": "uuid",
    "results": [
      {
        "question_id": "uuid",
        "question_text": "What keyword declares a constant?",
        "your_answer": "c",
        "correct_answer": "c",
        "is_correct": true,
        "explanation": "const declares a block-scoped constant",
        "difficulty_at_time": "easy",
        "time_spent": 15
      }
    ]
  }
}
```

### POST `/api/student/quiz/[id]/heartbeat`
**Access:** Student
**Body:** `{ "attempt_id": "uuid" }`
**Called every 30s** by the client while a question is on screen. Syncs `time_remaining_seconds`
from the server clock so a dead browser tab loses at most 30 seconds. Auto-submits if time has
run out.

### POST `/api/student/quiz/events`
**Access:** Student
**Body:**
```json
{
  "attempt_id": "uuid",
  "events": [
    { "type": "tab_switch", "timestamp": "2026-08-29T10:05:23Z", "metadata": {} }
  ]
}
```
**Batched:** Client sends events every 30 seconds (not per event)

---

## Analytics

### GET `/api/analytics/course/[id]`
**Access:** Admin (with `view_analytics` permission)
**Query:** `?range=30d`
**Response:**
```json
{
  "data": {
    "summary": {
      "total_students": 24,
      "total_quizzes": 5,
      "average_score": 72.5,
      "pass_rate": 0.68,
      "completion_rate": 0.85
    },
    "score_distribution": [
      { "range": "0-49", "count": 3 },
      { "range": "50-59", "count": 5 },
      { "range": "60-69", "count": 4 },
      { "range": "70-79", "count": 6 },
      { "range": "80-89", "count": 4 },
      { "range": "90-100", "count": 2 }
    ],
    "quiz_scores": [
      { "quiz_title": "JS Basics", "avg_score": 75.2, "attempts": 22 }
    ],
    "scores_over_time": [
      { "date": "2026-08-01", "avg_score": 68.5 }
    ]
  }
}
```

### GET `/api/analytics/student/[id]`
**Access:** Admin
**Response:** Student's scores, attempts, strengths, weaknesses

### GET `/api/analytics/quiz/[id]/questions`
**Access:** Admin
**Response:** Per-question analytics (correct %, avg time, most chosen wrong option)

---

## Anti-Cheat Report

### GET `/api/analytics/quiz/[id]/integrity`
**Access:** Admin
**Response:**
```json
{
  "data": {
    "students": [
      {
        "student_id": "uuid",
        "student_name": "Sara Ahmed",
        "integrity_score": 85,
        "tab_switches": 2,
        "fullscreen_exits": 0,
        "fast_answers": 1,
        "copy_attempts": 0,
        "flagged": false
      }
    ]
  }
}
```

---

## Certificates

### GET `/api/certificates/[id]/download`
**Access:** Student (own cert) or Admin (any org cert)
**Response:** PDF binary (generated via jsPDF server-side or client-side)

---

## Settings

### GET `/api/settings`
**Access:** Admin
**Response:** Organization settings, plan info, usage stats

### PATCH `/api/settings`
**Access:** Admin (with `manage_settings` permission)
**Body:** Updated settings fields

### PATCH `/api/settings/gemini-key`
**Access:** Admin (super admin only)
**Body:** `{ "api_key": "AIza..." }`
**Flow:** Validate key with a test API call → encrypt → store

---

## Sub-Admins

### POST `/api/sub-admins/invite`
**Access:** Super Admin only
**Body:** `{ "email": "subadmin@email.com" }`
**Validates:** Plan allows more sub-admins
**Side effects:** Sends invite email

### PATCH `/api/sub-admins/[id]/permissions`
**Access:** Super Admin only
**Body:** `{ "create_course": true, "approve_quiz": false, ... }`

### DELETE `/api/sub-admins/[id]`
**Access:** Super Admin only
**Side effects:** Removes permissions, updates profile role to null/removed

---

## Notifications

### GET `/api/notifications`
**Access:** Authenticated user
**Query:** `?unread=true&limit=20`
**Response:** `{ data: [Notification], unread_count }`

### PATCH `/api/notifications/[id]/read`
**Access:** Authenticated user (own notifications)

### PATCH `/api/notifications/read-all`
**Access:** Authenticated user

---

## Usage & Plan

### GET `/api/usage`
**Access:** Admin
**Response:**
```json
{
  "data": {
    "plan": "free",
    "courses": { "used": 2, "limit": 3 },
    "ai_today": {
      "course_1": { "used": 10, "limit": 15 },
      "course_2": { "used": 0, "limit": 15 }
    },
    "students": {
      "course_1": { "enrolled": 18, "limit": 25 }
    }
  }
}
```

---

## Error Response Format

All errors follow this shape:
```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "You've reached the Free plan limit of 3 courses.",
    "upgrade": true
  }
}
```

### Error Codes
| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | No permission for this action |
| `NOT_FOUND` | 404 | Resource doesn't exist or not in your org |
| `PLAN_LIMIT_EXCEEDED` | 403 | Hit plan limit (include upgrade prompt) |
| `AI_DAILY_LIMIT` | 429 | Daily AI generation limit reached |
| `INVALID_INVITE_CODE` | 400 | Code invalid, expired, or full |
| `QUIZ_NOT_DRAFT` | 400 | Trying to edit a non-draft quiz |
| `NO_ATTEMPTS_LEFT` | 400 | Student used all quiz attempts |
| `QUIZ_TIME_EXPIRED` | 400 | Submission after time limit |
| `GEMINI_KEY_INVALID` | 400 | Admin's API key doesn't work |
| `GEMINI_API_ERROR` | 502 | Gemini API returned an error |
| `VALIDATION_ERROR` | 400 | Zod validation failed (include field errors) |
