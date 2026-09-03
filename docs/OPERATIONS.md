# Running Quizo

Plain-English notes for keeping the live site working. Written for Talha, not for a developer.

---

## 1. The settings the live site needs

These live in **Vercel → your project → Settings → Environment Variables**, not in the code. The
code is public in a git repository; these are secrets and must never go in it.

| Setting | What breaks without it | Who sets it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everything. Nothing can reach the database. | already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything. | already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Signup, the platform-owner area, certificate verification. | already set |
| `ENCRYPTION_KEY` | Every saved Gemini key becomes unreadable. **See §2.** | already set |
| `RESEND_API_KEY` | Approval and rejection emails silently fail (they are logged, nothing else breaks). | already set |
| `PLATFORM_OWNER_EMAILS` | **`/platform` is unreachable for everyone, including you.** | **you, still to do** |
| `PLATFORM_GEMINI_API_KEY` | Paid academies cannot generate questions, even though the pricing page says AI is included. | **you, still to do** |

`PLATFORM_OWNER_EMAILS` should be `talhawork257@gmail.com`. After adding either one, Vercel needs a
new deployment before it takes effect — pushing any commit does that.

Missing configuration is no longer silent: if `PLATFORM_OWNER_EMAILS` is empty the server writes a
clear line into Vercel's Runtime Logs saying so.

> Note on your own machine: `.env.local` currently has a variable called `GEMINI_API_KEY`, which
> nothing reads. The name the code looks for is `PLATFORM_GEMINI_API_KEY`. Renaming it locally makes
> AI-on-paid-plans work on your machine too.

---

## 2. The one secret that cannot be replaced

`ENCRYPTION_KEY` is what locks and unlocks each academy's own Gemini API key. It is a 64-character
string of letters and numbers.

**If it is ever lost, every saved Gemini key becomes permanently unreadable.** There is no copy of
those keys in plain text anywhere — that is the point of encrypting them. Free-plan academies would
each have to go and re-enter their key by hand.

**🔵 To do, once, by hand:** open Vercel → Settings → Environment Variables, reveal
`ENCRYPTION_KEY`, and save the value somewhere that is not this computer and not the repository — a
password manager is ideal. This takes two minutes and removes the only unrecoverable failure in the
whole system.

---

## 3. Backing up the database

Supabase's free tier keeps daily backups for you, but it does **not** offer point-in-time recovery,
and a free project is **paused after 7 days with no activity**. A paused project looks exactly like
a broken one to a visitor.

**🔵 Before any demo:** open the Supabase dashboard and press Restore if it shows as paused.

**🔵 Worth doing monthly:** Supabase dashboard → Database → Backups → download. Keep the file off
this computer.

---

## 4. What each kind of failure looks like now

Every one of these used to be a silent or misleading screen. They are now honest:

| What happened | What the person sees |
|---|---|
| Database unreachable or asleep | "Could not load your courses" — never "No courses yet" |
| Something failed before the page could start | A branded "Quizo could not load" page with a Try again button |
| A page crashed | "Something went wrong" with a Try again button |
| Gemini is down or slow | "The AI service took too long to respond" — the request is cut off at 45 seconds so it never hits Vercel's 60-second kill |
| Gemini's free quota is used up | "The daily AI quota has been used up. Try again tomorrow." |
| The academy's own Gemini key is wrong | "The AI service rejected the request. Check your key in Settings." |
| A student's connection drops mid-quiz | A retry banner; the answer is re-sent, and the server keeps the clock |
| A student's time ran out while away | They are taken to their result, not left stuck on a question |
| An email cannot be sent | The action still succeeds; the failure is recorded in `email_log` |

---

## 5. Where to look when something goes wrong

**Vercel → your project → Logs.** Every server-side failure now writes one line starting with
`[quizo]`, saying what failed and giving the ids involved. No student answers, email addresses or
API keys are ever written there.

The lines to search for:

- `[quizo] PLATFORM_OWNER_EMAILS is not set` — the platform area is locked for everyone
- `[quizo] generate-questions.gemini failed` — the AI call itself failed
- `[quizo] generate-questions.save failed` — questions were generated but not saved
- `[quizo] submit-answer.insert failed` — a student's answer could not be recorded
- `[quizo] quiz-start.insert failed` — a student could not start a quiz
- `[quizo] certificate.issue failed` — a student passed but received no certificate

---

## 6. What is still not built

- **Taking payment.** Nothing charges anyone. Pro and Institution are switched on by hand in
  `/platform`. The prices on the pricing page are real intentions, not a working checkout.
- **Emails to addresses other than yours.** Resend's free tier only delivers to the address you
  verified. Everything else is written to `email_log` and fails quietly, by design, so an email
  problem can never undo an approval.
