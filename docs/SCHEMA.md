# Quizo — Database Schema

> Supabase PostgreSQL. Every table has RLS enabled.
> Every data table has `organization_id` — NO EXCEPTIONS.
> Use `current_org()` function to get org from JWT.

---

## Helper Function

```sql
CREATE OR REPLACE FUNCTION current_org() RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'organization_id')::uuid;
$$ LANGUAGE sql STABLE;
```

---

## Table 1: organizations

The root tenant table. Every other table references this.

```sql
CREATE TABLE organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,            -- URL-safe name (quizo.app/org/slug)
  logo_url        text,
  plan            text NOT NULL DEFAULT 'free',     -- 'free' | 'pro' | 'institution'
  plan_expires_at timestamptz,
  owner_id        uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS: user can see their own org only
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org" ON organizations
  FOR SELECT USING (id = current_org());
CREATE POLICY "Owner can update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());
```

---

## Table 2: organization_settings

Per-org config: Gemini API key, notification prefs, branding.

```sql
CREATE TABLE organization_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  gemini_api_key    text,                          -- encrypted at rest
  notification_prefs jsonb DEFAULT '{}',
  branding          jsonb DEFAULT '{}',            -- colors, logo for certificates
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members see own settings" ON organization_settings
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Admin can update settings" ON organization_settings
  FOR UPDATE USING (organization_id = current_org());
```

---

## Table 3: profiles

Extended user profile linked to auth.users.

```sql
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  full_name       text NOT NULL,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'admin',   -- 'admin' | 'sub_admin' | 'student'
  avatar_url      text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS: users see profiles within their org
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own org profiles" ON profiles
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
```

### ⚠️ Column guard — required, not optional

The "update own profile" policy above is **row-level, not column-level**. Postgres RLS cannot stop
a student from editing `role`, `organization_id` or `is_active` on their own row just because the
row belongs to them — which would let a student promote themselves to admin, or move themselves
into another academy.

This exact gap was found and closed in v1. Carry the fix forward:

```sql
CREATE OR REPLACE FUNCTION profiles_prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only guard real logged-in sessions. Direct DB access (SQL editor, MCP,
  -- migrations) is a separate, already-trusted boundary.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND NOT is_org_admin(auth.uid())
  THEN
    RAISE EXCEPTION 'Not allowed to change role, organization or active status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profiles_prevent_self_privilege_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_prevent_self_privilege_escalation();
```

---

## Table 4: sub_admin_permissions

Permission matrix for sub-admins (Pro/Institution only).

```sql
CREATE TABLE sub_admin_permissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  create_course   boolean DEFAULT false,
  edit_course     boolean DEFAULT false,
  delete_course   boolean DEFAULT false,
  create_quiz     boolean DEFAULT false,
  approve_quiz    boolean DEFAULT false,
  view_students   boolean DEFAULT true,
  manage_enrollments boolean DEFAULT false,
  view_analytics  boolean DEFAULT true,
  manage_settings boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- RLS
ALTER TABLE sub_admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members see permissions" ON sub_admin_permissions
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Owner manages permissions" ON sub_admin_permissions
  FOR ALL USING (
    organization_id = current_org()
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = current_org() AND owner_id = auth.uid()
    )
  );
```

---

## Table 5: courses

```sql
CREATE TABLE courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  subject         text,
  invite_code     text UNIQUE NOT NULL,
  invite_code_expires_at timestamptz,
  max_students    integer NOT NULL DEFAULT 25,
  status          text NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members see own courses" ON courses
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Admin creates courses" ON courses
  FOR INSERT WITH CHECK (organization_id = current_org());
CREATE POLICY "Admin updates own courses" ON courses
  FOR UPDATE USING (organization_id = current_org());
CREATE POLICY "Admin deletes own courses" ON courses
  FOR DELETE USING (organization_id = current_org());
```

---

## Table 6: enrollments

```sql
CREATE TABLE enrollments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  approved_by     uuid REFERENCES auth.users(id),
  approved_at     timestamptz,
  rejected_reason text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(course_id, student_id)
);

-- RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins see enrollments" ON enrollments
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Students see own enrollment" ON enrollments
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can request enrollment" ON enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admin manages enrollments" ON enrollments
  FOR UPDATE USING (organization_id = current_org());
```

---

## Table 7: quizzes

```sql
CREATE TABLE quizzes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           text NOT NULL,
  topic           text NOT NULL,
  description     text,
  questions_to_show integer NOT NULL DEFAULT 10,
  pool_multiplier integer NOT NULL DEFAULT 1,      -- 1 for Free, 3 for Pro
  time_limit_minutes integer DEFAULT 30,
  max_attempts    integer NOT NULL DEFAULT 2,
  passing_score   integer NOT NULL DEFAULT 70,     -- percentage
  status          text NOT NULL DEFAULT 'draft',   -- 'draft' | 'in_review' | 'published' | 'rejected' | 'archived'
  review_comment  text,                            -- reason for rejection
  reviewed_by     uuid REFERENCES auth.users(id),
  published_at    timestamptz,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins see all quizzes" ON quizzes
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Students see published quizzes" ON quizzes
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = quizzes.course_id
        AND enrollments.student_id = auth.uid()
        AND enrollments.status = 'approved'
    )
  );
CREATE POLICY "Admin manages quizzes" ON quizzes
  FOR ALL USING (organization_id = current_org());
```

---

## Table 8: quiz_pools

One pool per quiz — holds the generated questions.

```sql
CREATE TABLE quiz_pools (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quiz_id         uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  total_questions integer NOT NULL,
  easy_count      integer NOT NULL,
  medium_count    integer NOT NULL,
  hard_count      integer NOT NULL,
  generated_by    text DEFAULT 'gemini',           -- AI model used
  created_at      timestamptz DEFAULT now(),
  UNIQUE(quiz_id)
);

-- RLS
ALTER TABLE quiz_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org access" ON quiz_pools
  FOR ALL USING (organization_id = current_org());
```

---

## Table 9: pool_questions

Individual questions within a pool.

```sql
CREATE TABLE pool_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pool_id         uuid NOT NULL REFERENCES quiz_pools(id) ON DELETE CASCADE,
  question_text   text NOT NULL,
  difficulty      text NOT NULL,                   -- 'easy' | 'medium' | 'hard'
  option_a        text NOT NULL,
  option_b        text NOT NULL,
  option_c        text NOT NULL,
  option_d        text NOT NULL,
  correct_option  text NOT NULL,                   -- 'a' | 'b' | 'c' | 'd'
  explanation     text,                            -- why the answer is correct
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- RLS: CRITICAL — answer key must never leak to students
ALTER TABLE pool_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees all" ON pool_questions
  FOR SELECT USING (organization_id = current_org());
-- Students NEVER directly query this table. 
-- Quiz player API returns questions WITHOUT correct_option.
-- Correct answers are checked server-side only.
```

---

## Table 10: quiz_attempts

```sql
CREATE TABLE quiz_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quiz_id         uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number  integer NOT NULL,
  score           decimal(5,2),                    -- percentage 0.00-100.00
  total_correct   integer DEFAULT 0,
  total_questions integer NOT NULL,
  time_taken_seconds integer,
  is_best_attempt boolean DEFAULT false,
  started_at      timestamptz NOT NULL DEFAULT now(),
  submitted_at    timestamptz,
  status          text NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'submitted' | 'timed_out'
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own attempts" ON quiz_attempts
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students create attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own attempts" ON quiz_attempts
  FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admin sees all attempts in org" ON quiz_attempts
  FOR SELECT USING (organization_id = current_org());
```

---

## Table 11: attempt_answers

Per-question answers for each attempt.

```sql
CREATE TABLE attempt_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attempt_id      uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES pool_questions(id) ON DELETE CASCADE,
  selected_option text,                            -- 'a' | 'b' | 'c' | 'd' | null (skipped)
  is_correct      boolean,
  time_spent_seconds integer,
  display_order   integer NOT NULL,                -- order shown to student
  options_order   text NOT NULL,                   -- shuffled order e.g. 'c,a,d,b'
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own answers" ON attempt_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts
      WHERE quiz_attempts.id = attempt_answers.attempt_id
        AND quiz_attempts.student_id = auth.uid()
    )
  );
CREATE POLICY "Admin sees org answers" ON attempt_answers
  FOR SELECT USING (organization_id = current_org());
```

---

## Table 12: quiz_event_stream

Anti-cheating event log.

```sql
CREATE TABLE quiz_event_stream (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attempt_id      uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES auth.users(id),
  event_type      text NOT NULL,
  -- Event types: 'quiz_started' | 'tab_switch' | 'fullscreen_exit' |
  --              'copy_attempt' | 'paste_attempt' | 'fast_answer' |
  --              'quiz_submitted' | 'focus_lost' | 'browser_resize'
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

-- Index for fast querying by attempt
CREATE INDEX idx_events_attempt ON quiz_event_stream(attempt_id);
CREATE INDEX idx_events_student ON quiz_event_stream(student_id);

-- RLS
ALTER TABLE quiz_event_stream ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees org events" ON quiz_event_stream
  FOR SELECT USING (organization_id = current_org());
CREATE POLICY "Students can insert own events" ON quiz_event_stream
  FOR INSERT WITH CHECK (student_id = auth.uid());
```

---

## Table 13: ai_usage_log

Track daily AI question generation against limits.

```sql
CREATE TABLE ai_usage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  quiz_id         uuid REFERENCES quizzes(id),
  questions_generated integer NOT NULL,
  model_used      text DEFAULT 'gemini-3.6-flash',   -- 2.0 and 2.5 are retired
  created_at      timestamptz DEFAULT now()
);

-- Index for daily limit check
CREATE INDEX idx_ai_usage_daily ON ai_usage_log(organization_id, course_id, created_at);

-- RLS
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org access" ON ai_usage_log
  FOR ALL USING (organization_id = current_org());
```

**Daily limit query:**
```sql
SELECT COALESCE(SUM(questions_generated), 0)
FROM ai_usage_log
WHERE course_id = $1
  AND organization_id = current_org()
  AND created_at::date = CURRENT_DATE;
```

---

## Table 14: certificates

```sql
CREATE TABLE certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  quiz_id         uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id      uuid NOT NULL REFERENCES quiz_attempts(id),
  score           decimal(5,2) NOT NULL,
  certificate_number text UNIQUE NOT NULL,         -- e.g. QZ-2026-00001
  issued_at       timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own certs" ON certificates
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admin sees org certs" ON certificates
  FOR SELECT USING (organization_id = current_org());
```

---

## Table 15: notifications

In-app notification system.

```sql
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL,
  -- Types: 'enrollment_request' | 'enrollment_approved' | 'enrollment_rejected' |
  --        'quiz_published' | 'quiz_graded' | 'certificate_earned' |
  --        'sub_admin_invited' | 'plan_limit_warning'
  title           text NOT NULL,
  message         text,
  link            text,                            -- in-app link to relevant page
  is_read         boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
```

---

## Table 16: email_log

Track sent emails for debugging and rate limiting.

```sql
CREATE TABLE email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  to_email        text NOT NULL,
  template        text NOT NULL,
  subject         text NOT NULL,
  status          text NOT NULL DEFAULT 'sent',    -- 'sent' | 'failed' | 'bounced'
  resend_id       text,                            -- Resend's message ID
  error_message   text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_email_daily ON email_log(organization_id, created_at);

-- RLS
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sees org email log" ON email_log
  FOR SELECT USING (organization_id = current_org());
```

---

## Table 17: invite_codes

Separate table for invite code management.

```sql
CREATE TABLE invite_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code            text UNIQUE NOT NULL,
  max_uses        integer NOT NULL DEFAULT 25,
  used_count      integer DEFAULT 0,
  expires_at      timestamptz NOT NULL,
  is_active       boolean DEFAULT true,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org access" ON invite_codes
  FOR ALL USING (organization_id = current_org());
CREATE POLICY "Students validate codes" ON invite_codes
  FOR SELECT USING (is_active = true AND expires_at > now());
```

---

## Table 18: plan_limits

Reference table for plan restrictions. Seeded, not user-editable.

```sql
CREATE TABLE plan_limits (
  plan              text PRIMARY KEY,              -- 'free' | 'pro' | 'institution'
  max_courses       integer NOT NULL,
  max_students_per_course integer NOT NULL,
  max_ai_questions_per_day integer NOT NULL,
  max_quiz_attempts integer NOT NULL,
  max_sub_admins    integer NOT NULL,
  pool_multiplier   integer NOT NULL,
  has_anti_cheat_full boolean DEFAULT false,
  has_custom_branding boolean DEFAULT false,
  has_white_label   boolean DEFAULT false,
  has_csv_export    boolean DEFAULT false,
  price_monthly     decimal(10,2) NOT NULL DEFAULT 0
);

-- Seed data
INSERT INTO plan_limits VALUES
  ('free',        3,  25,  15,  2,  0, 1, false, false, false, false, 0),
  ('pro',         -1, 100, 50,  5,  3, 3, true,  true,  false, true,  19),
  ('institution', -1, 500, 200, -1, 10, 3, true,  true,  true,  true,  49);
-- -1 means unlimited

-- No RLS needed — this is public reference data
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read" ON plan_limits
  FOR SELECT USING (true);
```

---

## Table 19: content_uploads

**Deliberately added back, not in the original spec.** The AI generation prompt this project
keeps (`src/app/api/generate-questions/prompt.ts`, kept because it produces genuinely strong,
scenario-based questions) grounds every question in real source material — it is not a bare-topic
prompt. Dropping this table in favor of the spec's topic-only flow would mean either weakening
that prompt or feeding it nothing to ground itself in. `course_outlines` (v1's separate
syllabus/topic-list feature) was **not** brought back — it's tangential UI sugar the new design
doesn't call for either, unlike this table which is load-bearing for generation quality.

```sql
CREATE TABLE content_uploads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  source_type       text NOT NULL,             -- 'text' | 'image'
  raw_text          text NOT NULL,              -- for images, the admin-corrected OCR output
  original_filename text,
  uploaded_by       uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE content_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org access" ON content_uploads
  FOR ALL USING (organization_id = current_org());
```

> OCR output is always editable before saving — Tesseract is never perfect; what's stored is what
> the admin approved. Same rule as v1.

---

## Entity Relationship Summary

```
organizations (1)
  ├── organization_settings (1:1)
  ├── profiles (1:N)
  ├── sub_admin_permissions (1:N)
  ├── courses (1:N)
  │     ├── enrollments (1:N)
  │     ├── invite_codes (1:N)
  │     ├── quizzes (1:N)
  │     │     ├── quiz_pools (1:1)
  │     │     │     └── pool_questions (1:N)
  │     │     ├── quiz_attempts (1:N)
  │     │     │     ├── attempt_answers (1:N)
  │     │     │     └── quiz_event_stream (1:N)
  │     │     └── certificates (1:N)
  │     └── ai_usage_log (1:N)
  ├── notifications (1:N)
  └── email_log (1:N)

plan_limits (standalone reference table)
```

---

## Correction: "who did this" columns reference `profiles`, not `auth.users`

The table definitions above (copied from the original spec) point every `student_id`,
`created_by`, `owner_id`, `approved_by`, `reviewed_by` and `uploaded_by`/`user_id` column at
`auth.users(id)`. That was found live, during Phase G, to silently break a whole class of query:
PostgREST cannot auto-embed related row data across a foreign key into the `auth` schema — Supabase
deliberately restricts introspection there. A query like
`enrollments.select("*, profiles(full_name)")` compiles, runs, and returns **no error**, just an
empty embed — exactly what happened on the Students page: the sidebar's separate count query
worked, but the page's own query silently found nothing.

**Fix:** every one of those columns (except `profiles.id` itself, which must keep referencing
`auth.users(id)` — that's the base identity link, not a display-embedding case) was repointed at
`profiles(id)` instead. `profiles.id` is always the same UUID as the owning `auth.users.id` — the
signup trigger creates both rows atomically — so this changes nothing about which rows are valid,
it only makes them embeddable.

**One consequence worth knowing:** `organizations.owner_id → profiles(id)` and
`profiles.organization_id → organizations(id)` are now mutually circular. The signup trigger
inserts the organization row before the profile row (it needs the new org's id to put in
`profiles.organization_id`), so `organizations_owner_id_fkey` is
`DEFERRABLE INITIALLY DEFERRED` — Postgres checks it at transaction commit instead of immediately,
by which point both rows exist within the same trigger's transaction.

---

## Migration Order

Run in this exact order (foreign key dependencies):

1. `plan_limits` (no dependencies)
2. `organizations`
3. `organization_settings` (depends on organizations)
4. `profiles` (depends on organizations, auth.users)
5. `sub_admin_permissions` (depends on organizations, auth.users)
6. `courses` (depends on organizations, auth.users)
7. `invite_codes` (depends on organizations, courses, auth.users)
8. `enrollments` (depends on organizations, courses, auth.users)
9. `quizzes` (depends on organizations, courses, auth.users)
10. `quiz_pools` (depends on organizations, quizzes)
11. `pool_questions` (depends on organizations, quiz_pools)
12. `quiz_attempts` (depends on organizations, quizzes, auth.users)
13. `attempt_answers` (depends on organizations, quiz_attempts, pool_questions)
14. `quiz_event_stream` (depends on organizations, quiz_attempts, auth.users)
15. `certificates` (depends on organizations, courses, quizzes, auth.users, quiz_attempts)
16. `notifications` (depends on organizations, auth.users)
17. `email_log` (depends on organizations)
18. `ai_usage_log` (depends on organizations, courses, quizzes)

---

## Indexes (Beyond Primary Keys)

```sql
-- Performance indexes
CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id, status);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_quizzes_course ON quizzes(course_id, status);
CREATE INDEX idx_pool_questions_pool ON pool_questions(pool_id, difficulty);
CREATE INDEX idx_attempts_quiz_student ON quiz_attempts(quiz_id, student_id);
CREATE INDEX idx_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_answers_attempt ON attempt_answers(attempt_id);
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code) WHERE is_active = true;
```

---

## Updated_at Trigger

Apply to all tables with `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table:
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
