# Design System

Single source of truth for every visual decision. Never invent a colour, size or spacing that is not in this file.

---

## Design thinking

This is an **exam platform**, not a shopping site. A student using it is already nervous, watching a timer. The interface has one job: **reduce anxiety and keep attention on the question.**

Three consequences:

1. **Blue family as the primary colour.** Blue is the lowest-arousal hue on screen. Red or orange as a primary raises stress.
2. **Red is reserved.** Only wrong answers, failures, errors and destructive actions. If red decorates, it stops meaning danger — and when an answer is actually wrong, the eye no longer reacts.
3. **Difficulty must never look like a verdict.** In an adaptive system, reaching Hard is an *achievement*. Colouring it red punishes the student for succeeding.

---

## Colour — Light theme

### Brand

| Token | Hex | Use |
|---|---|---|
| `primary-600` | `#4F46E5` | Primary buttons, active links, selected state, logo |
| `primary-700` | `#4338CA` | Hover state on primary |
| `primary-100` | `#E0E7FF` | Background behind selected items |
| `primary-50` | `#EEF2FF` | Table headers, highlight rows |

### Neutral

| Token | Hex | Use |
|---|---|---|
| `background` | `#F8FAFC` | Page background — deliberately not pure white |
| `surface` | `#FFFFFF` | Cards, modals — sits *on top* of the background |
| `border` | `#E2E8F0` | Card borders, table rules, input outlines |
| `text-primary` | `#0F172A` | Headings and body |
| `text-secondary` | `#475569` | Sub-labels, helper text |
| `text-muted` | `#94A3B8` | Placeholders, disabled, timestamps |

> The page is grey and cards are white so cards **float** without heavy borders. If both were white, every card would need a hard outline and the layout would look homemade.

### Semantic

| Meaning | Foreground | Background | Use |
|---|---|---|---|
| Success | `#16A34A` | `#DCFCE7` | Correct answer, PASS, saved, approved |
| Warning | `#D97706` | `#FEF3C7` | Timer under 5 min, pending approval, unsaved |
| Danger | `#DC2626` | `#FEE2E2` | Wrong answer, FAIL, delete, error |
| Info | `#2563EB` | `#DBEAFE` | Instructions, tips, neutral notices |

---

## Colour — Dark theme

> Dark mode is **not** inverted light mode. Four rules make it correct.

1. **Never pure black.** `#000000` beside white text causes halation — a glowing blur. Use dark blue-grey.
2. **Never pure white text.** Too harsh on dark. Use off-white.
3. **Surfaces get *lighter* to show elevation, not darker.** Shadows barely register on dark, so lightness does that work.
4. **Brand colours must lighten.** Saturated `#4F46E5` vibrates painfully on dark. Shift up.

| Token | Dark | Light was | Note |
|---|---|---|---|
| `background` | `#0F172A` | `#F8FAFC` | Dark blue-grey, not black |
| `surface` | `#1E293B` | `#FFFFFF` | Lighter than background |
| `surface-raised` | `#334155` | `#F1F5F9` | Menus, popups — lighter still |
| `border` | `#334155` | `#E2E8F0` | Subtle, never harsh |
| `text-primary` | `#F1F5F9` | `#0F172A` | Off-white |
| `text-secondary` | `#CBD5E1` | `#475569` | |
| `text-muted` | `#94A3B8` | `#94A3B8` | Same in both |
| `primary` | `#818CF8` | `#4F46E5` | Lightened |
| `success` | `#4ADE80` | `#16A34A` | Lightened |
| `warning` | `#FBBF24` | `#D97706` | Lightened |
| `danger` | `#F87171` | `#DC2626` | Lightened |

**Shadows in dark mode: reduce to almost nothing.** Use `surface-raised` to signal elevation instead.

---

## Theme behaviour

- Three options: **Light · Dark · System**. Default is **System**.
- System reads the device preference automatically. Someone reading at night gets dark without asking.
- Once the user picks Light or Dark manually, persist it in `localStorage` and never override.
- **Zero flash on load.** A white flash before dark mode is a visible bug and hurts at night. If it appears: *"I am getting a white flash before dark mode loads. Fix the theme hydration."*

**One exception:** the certificate PDF is always light-coloured, ignoring the theme entirely. It gets printed.

---

## Difficulty indicator

> **Never use green / yellow / red for Easy / Medium / Hard.**
>
> 1. Green and red already mean correct and wrong. A red "Hard" badge reads as "I got it wrong".
> 2. It makes Hard feel like punishment when reaching Hard is an achievement.
> 3. Roughly 1 in 12 men cannot distinguish green from red — the whole system would be invisible to them.

### Primary treatment — filled bars

Three small bars, all in slate `#64748B`. Fill count carries the meaning.

| Level | Bars |
|---|---|
| Easy | ▓░░ |
| Medium | ▓▓░ |
| Hard | ▓▓▓ |

Always show the **word** beside the bars: `▓▓░ Medium`. Never shape alone.

Works unchanged in dark mode. Colourblind-safe because meaning is carried by **shape**.

### Optional tint — admin lists only

Where hundreds of questions are being scanned, colour aids speed. Use a **violet ramp** — darker means harder. Violet carries no other meaning anywhere in this app.

| Level | Badge bg | Badge text |
|---|---|---|
| Easy | `#F5F3FF` | `#7C3AED` |
| Medium | `#EDE9FE` | `#6D28D9` |
| Hard | `#DDD6FE` | `#4C1D95` |

---

## Timer states

| Time remaining | Colour | Weight |
|---|---|---|
| Above 50% | `text-secondary` | normal, small |
| 50% → 20% | `text-primary` | normal |
| Under 5 minutes | `warning` | bold |
| Under 1 minute | `danger` | bold, larger |

> **The timer must never flash or blink.** Flashing content can trigger photosensitive seizures and spikes anxiety in everyone else. A colour and size change is sufficient. This is an accessibility requirement, not a preference.

---

## Typography

**Font: Inter**, everything. Free via Google Fonts, designed for screens, unusually clear numerals — which matters for the timer and score displays.

One font family. Different sizes and weights. Never mix two or three families.

| Role | Size | Weight |
|---|---|---|
| Page title | 30px | 700 |
| Section heading | 24px | 600 |
| Card heading | 18px | 600 |
| **Question text** | **20px** | 500 |
| **Option text** | **16px** | 400 |
| Body | 16px | 400 |
| Helper / label | 14px | 400 |
| Badge / tiny | 12px | 500 |

**Never go below 14px for readable text.** Anything smaller is unreadable on a phone.

---

## Spacing

Every gap is a multiple of **4px**: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`. Never 5, 13 or 17.

| Gap | Use |
|---|---|
| 4px | Icon to its label |
| 8px | Form label to input |
| 12px | Between answer options |
| 16px | Card padding, between form fields |
| 24px | Between cards |
| 32px | Between page sections |
| 48px | Above and below a page title |

Random spacing is what makes a layout feel wrong even when nobody can name why.

---

## Radius and elevation

| Radius | Use |
|---|---|
| 6px | Buttons, inputs, small badges |
| 8px | Cards, answer option boxes |
| 12px | Large panels, modals |
| Full | Avatars, status dots only |

**Two shadows only:** small for cards resting on the page, large for popups floating above. Adding a shadow to everything turns a page muddy.

---

## Answer option box — the most-viewed component

Five states. Each must be unmistakable.

| State | Border | Background | Extra |
|---|---|---|---|
| Normal | 1px `#E2E8F0` | `surface` | Pointer cursor |
| Hover | 1px `#818CF8` | `#F8FAFC` | Slight lift |
| Selected | **2px** `#4F46E5` | `#EEF2FF` | Filled circle left |
| Correct | 2px `#16A34A` | `#DCFCE7` | **Tick icon** right |
| Wrong | 2px `#DC2626` | `#FEE2E2` | **Cross icon** right |

> Correct and Wrong each carry an **icon**, not just a colour. A colourblind student sees green and red as near-identical brown — the tick and cross are what actually communicate.
>
> **Rule everywhere: colour is never the only signal.**

---

## Accessibility — not optional

| Rule | Requirement |
|---|---|
| Contrast | ≥ 4.5:1 for body text. Every colour here passes. Verify changes at `webaim.org/resources/contrastchecker` |
| Focus ring | Always visible on Tab. Never removed. |
| Touch target | ≥ 44px tall for every button and answer option |
| Colour | Never the only carrier of meaning |
| Motion | Nothing flashes or blinks. Respect `prefers-reduced-motion`. |

---

## Component inventory — `src/components/ui/`

| Component | Spec |
|---|---|
| `Button` | Variants primary · secondary · danger · ghost. Sizes sm · md · lg. Loading spinner and disabled states. Min height 44px. |
| `Input` | Label, placeholder, error text below, visible focus ring |
| `Card` | Surface, border, small shadow, 16px padding |
| `Badge` | success · warning · danger · info · neutral |
| `DifficultyIndicator` | Three slate bars + word. Never traffic-light colours. |
| `Modal` | Centred, dark overlay, closes on Escape |
| `Toast` | Top-right, auto-dismiss after 4s |
| `Table` | Striped rows, sticky header, horizontal scroll on mobile |
| `EmptyState` | Icon, heading, one line of text, action button |
| `LoadingSpinner` / `Skeleton` | For every async surface |
| `ThemeToggle` | Sun / moon, lucide-react |

**Reuse these. Never write a one-off button or input style.**

---

## Style guide page

Keep `/style-guide` for the life of the project. It renders every component in every state with a theme toggle. Before building any new screen, open it and reuse what already exists.
