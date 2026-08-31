# Quizo — Landing Page Content & Structure

> Copy-ready content for every section of the landing page.
> Build this in Phase 1. It is the first thing users see.

---

## Navigation Bar (Sticky)

```
[Quizo Logo]    Features    Pricing    FAQ    [Login]    [Start Free →]
```

- Logo: Text "Quizo" in spruce-700 + sparkles icon
- "Start Free →" is gold CTA button
- "Login" is ghost/text button
- Sticky on scroll with `bg-white/80 backdrop-blur` effect
- Mobile: hamburger menu → slide-in drawer

---

## Section 1: Hero

**Badge (above headline):**
"AI-Powered Quiz Platform"
`bg-spruce-50 text-spruce-700 text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1`

**Headline:**
"Create Adaptive Quizzes in Seconds, Not Hours"

**Subheadline:**
"AI generates quizzes that adapt to each student's level. Anti-cheat built in. Free forever for up to 3 courses."

**CTA Button:**
"Start Free — No Credit Card" (gold button, large)

**Secondary link:**
"See how it works ↓" (text link, scrolls to How It Works section)

**Right side:**
Product screenshot showing the quiz builder with AI generating questions. Display in a browser mockup frame with subtle shadow.

**Trust line below CTA:**
"✓ Free forever · ✓ No credit card · ✓ Set up in 2 minutes"

---

## Section 2: Social Proof Bar

**Background:** `bg-neutral-50` strip

**Content (launch version — use real numbers as you grow):**
```
📝 500+ Quizzes Created    👨‍🎓 10,000+ Students Tested    ⭐ 4.8/5 Rating
```

**Growth version (replace when you have real logos):**
```
"Trusted by academies across Pakistan, UAE, and beyond"
[Logo] [Logo] [Logo] [Logo] [Logo]
```

---

## Section 3: Problem → Solution

**Section title:** "Why Academies Choose Quizo"

**3 cards in a row (stack on mobile):**

**Card 1:**
- Icon: `Clock` (lucide) in red/error color
- Problem: "Creating quizzes takes hours"
- Solution: "AI generates 30 graded questions in 10 seconds from any topic. Just type what you want to test."
- Visual: crossed-out clock → sparkles icon

**Card 2:**
- Icon: `Shield` (lucide) in red/error color
- Problem: "Students share answers and cheat"
- Solution: "Every attempt gets shuffled questions, shuffled options, tab detection, and fullscreen lock. No two screens look the same."

**Card 3:**
- Icon: `BarChart3` (lucide) in red/error color
- Problem: "No idea who's struggling"
- Solution: "Adaptive difficulty adjusts in real-time. Easy students get harder questions. Struggling students get support. You see it all in analytics."

---

## Section 4: How It Works

**Section title:** "Up and Running in 3 Steps"

**Step 1:**
- Number: "01" in large spruce text
- Icon: `BookOpen`
- Title: "Create Your Course"
- Description: "Add your course, set an invite code, and share it with your students. They sign up and you approve."

**Step 2:**
- Number: "02"
- Icon: `Sparkles`
- Title: "AI Generates Your Quiz"
- Description: "Type a topic, pick the question count, and AI creates adaptive quizzes with easy, medium, and hard questions."

**Step 3:**
- Number: "03"
- Icon: `Trophy`
- Title: "Students Take & You Track"
- Description: "Students take quizzes on any device. You get real-time scores, analytics, and automatic certificates."

**Connecting line/arrow between steps (subtle, dashed)**

---

## Section 5: Features Grid

**Section title:** "Everything Your Academy Needs"
**Subtitle:** "Built for tutors, coaching centers, and training academies"

**6 cards (3×2 grid on desktop, 2×3 on tablet, 1×6 on mobile):**

| Icon | Title | Description |
|------|-------|-------------|
| `Sparkles` | AI Quiz Generation | Paste any topic — AI creates MCQs at 3 difficulty levels. Review and edit before publishing. |
| `TrendingUp` | Adaptive Difficulty | Quizzes start easy and get harder based on student performance. Every student gets the right challenge. |
| `ShieldCheck` | Anti-Cheating Suite | Question shuffle, option shuffle, tab detection, fullscreen lock, and response-time monitoring. |
| `Award` | Auto Certificates | PDF certificates generated automatically when students pass. Add your academy's branding. |
| `Building2` | Multi-Academy Isolation | Each academy's data is completely separate. Your students, your quizzes, your analytics — nobody else's. |
| `BarChart3` | Real-Time Analytics | See who's excelling, who's struggling, which questions are too hard, and track progress over time. |

---

## Section 6: Product Showcase

**Section title:** "See Quizo in Action"

**3 tabs (interactive — click to switch screenshot):**

**Tab 1: "Quiz Builder" (default active)**
- Screenshot of admin creating a quiz with AI
- Caption: "Type a topic and AI generates questions instantly. Edit, add, or remove before publishing."

**Tab 2: "Student View"**
- Screenshot of student taking a quiz (question card, timer, progress)
- Caption: "Clean, focused quiz experience. One question at a time. Timer keeps them on track."

**Tab 3: "Analytics"**
- Screenshot of analytics dashboard (charts, student table)
- Caption: "Know exactly how your students are performing. Drill down by quiz, student, or question."

---

## Section 7: Pricing

**Section title:** "Simple, Transparent Pricing"
**Subtitle:** "Start free. Upgrade when you're ready. No surprises."

**3 cards side by side:**

### Free Card
```
FREE
$0/month

For individual tutors getting started

✓ 3 courses
✓ 25 students per course
✓ 15 AI questions/day/course
✓ 2 quiz attempts
✓ Basic anti-cheating (shuffle + tab detect)
✓ Basic certificates
✓ Email notifications

[Start Free]
```

### Pro Card (HIGHLIGHTED — border-gold, "Most Popular" badge)
```
PRO ⭐ Most Popular
$19/month ($190/year — save 17%)

For growing academies

Everything in Free, plus:
✓ Unlimited courses
✓ 100 students per course
✓ 50 AI questions/day/course
✓ 5 quiz attempts
✓ 3× question pool (fresh questions each attempt)
✓ Full anti-cheating suite
✓ 3 sub-admins
✓ Custom branded certificates
✓ CSV export
✓ Remove "Powered by Quizo"

[Start Pro →]
```

### Institution Card
```
INSTITUTION
$49/month ($490/year — save 17%)

For coaching centers & schools

Everything in Pro, plus:
✓ 500 students per course
✓ 200 AI questions/day/course
✓ Unlimited quiz attempts
✓ 10 sub-admins
✓ Full white-label (your brand everywhere)
✓ Response-time analytics
✓ Priority support (24hr)
✓ API access (coming soon)

[Contact Us]
```

**Below pricing cards:**
"No credit card required · Cancel anytime · 14-day money back guarantee"

**Toggle:** Monthly / Yearly (show savings on yearly)

---

## Section 8: Testimonials

**Section title:** "What Academy Owners Say"

**3 testimonial cards:**

**Card 1:**
```
"I used to spend 2 hours making a quiz. With Quizo, I describe the topic and 
it's done in 30 seconds. My students get better quizzes and I get my evenings back."

— Ahmed K., Private Tutor
   ★★★★★
```

**Card 2:**
```
"The adaptive difficulty is exactly what we needed. Our advanced students aren't 
bored and our weaker students aren't overwhelmed. The analytics show me who needs 
help before they even ask."

— Sarah M., Academy Owner
   ★★★★★
```

**Card 3:**
```
"We caught 3 students sharing answers on WhatsApp last semester. With Quizo's 
shuffling and anti-cheat, every screen is different. Problem solved."

— Faisal R., Coaching Center Director
   ★★★★★
```

*Note: Replace with real testimonials from beta testers as soon as available.*

---

## Section 9: FAQ

**Section title:** "Frequently Asked Questions"

**Accordion component (click to expand):**

**Q: Is Quizo really free?**
A: Yes — the Free plan gives you 3 courses with up to 25 students each, forever. No credit card needed. No trial period. When you outgrow Free, upgrade to Pro.

**Q: How does the AI generate questions?**
A: You provide a topic (like "JavaScript variables" or "Cell biology chapter 5"). Our AI creates multiple-choice questions at three difficulty levels — easy, medium, and hard. You review and edit every question before students see them.

**Q: Do I need my own AI API key?**
A: Yes — each academy uses their own free Google Gemini API key. This keeps your costs at $0 (Gemini's free tier is very generous). We guide you through setup in 2 minutes.

**Q: Can students cheat?**
A: Quizo makes cheating very hard. Questions and answer options are shuffled every attempt, so no two screens look the same. Pro adds tab-switch detection, fullscreen lock, and response-time monitoring. Even if a student screenshots their quiz, the next attempt has different questions in a different order.

**Q: Is student data safe?**
A: Every academy's data is completely isolated using Row Level Security in our database. Academy A can never see Academy B's students, quizzes, or results. We're hosted on Supabase (built on PostgreSQL) with encryption at rest.

**Q: What if I need more than 25 students?**
A: Upgrade to Pro for 100 students per course, or Institution for 500. Your data carries over — nothing is lost.

**Q: Can I use my own branding?**
A: On Pro, you can remove the "Powered by Quizo" badge and add your academy logo to certificates. On Institution, everything is fully white-labeled — students see your brand, not ours.

---

## Section 10: Final CTA

**Background:** `bg-spruce-800` dark section (contrast)

**Headline (white text):**
"Ready to Stop Wasting Hours on Quizzes?"

**Subheadline (spruce-300 text):**
"Your first AI-generated quiz is 30 seconds away."

**CTA Button:** "Start Free — No Credit Card" (gold button, extra large)

**Below button (spruce-400 text):**
"Join 500+ academies already using Quizo"

---

## Footer

**Background:** `bg-spruce-900`

**4 columns:**

| Quizo | Product | Resources | Legal |
|-------|---------|-----------|-------|
| AI-powered quiz platform for academies | Features | Blog | Privacy Policy |
| | Pricing | Help Center | Terms of Service |
| [Social icons] | Changelog | Contact Us | Cookie Policy |

**Bottom bar:**
"© 2026 Quizo. All rights reserved."

---

## SEO

```html
<title>Quizo — AI-Powered Adaptive Quiz Platform for Academies</title>
<meta name="description" content="Create adaptive quizzes in seconds with AI. Anti-cheating built in. Free for up to 3 courses and 25 students. Perfect for tutors, coaching centers, and training academies." />
<meta property="og:title" content="Quizo — Create Adaptive Quizzes in Seconds" />
<meta property="og:description" content="AI generates quizzes that adapt to each student's level. Anti-cheat built in. Free forever." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```
