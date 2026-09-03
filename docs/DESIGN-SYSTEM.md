# Quizo — Design System

> This document defines every visual decision. Claude Code and all contributors
> must follow these specs exactly. No freestyle colors, fonts, or spacing.

---

## 1. Color Palette

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--spruce-950` | `#0A1F17` | Darkest text, headings |
| `--spruce-900` | `#0F2E22` | Sidebar background, footer |
| `--spruce-800` | `#153D2E` | Nav background, dark cards |
| `--spruce-700` | `#1B4D3E` | **Primary brand color** — buttons, links, accents |
| `--spruce-600` | `#256B54` | Hover states on primary |
| `--spruce-500` | `#2E8A6B` | Secondary buttons, icons |
| `--spruce-400` | `#4AAE8A` | Light accents, progress bars |
| `--spruce-300` | `#7DCDB0` | Badges, tags |
| `--spruce-200` | `#B3E4D0` | Light backgrounds, highlights |
| `--spruce-100` | `#D9F2E8` | Card backgrounds, hover states |
| `--spruce-50`  | `#EDFAF4` | Page section backgrounds |

### Accent Colors (CTA & Highlights)
| Token | Hex | Usage |
|-------|-----|-------|
| `--gold-500` | `#F4A300` | **Primary CTA buttons**, important badges. Fill only — never text on a light surface (2.1:1) |
| `--gold-600` | `#D48E00` | CTA hover state |
| `--gold-400` | `#FFBA33` | Star ratings, highlights |
| `--gold-100` | `#FFF3D6` | Warning backgrounds |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#15803D` | Correct answers, pass status, approval |
| `--success-light` | `#DCFCE7` | Success backgrounds |
| `--error` | `#DC2626` | Wrong answers, fail status, rejection |
| `--error-light` | `#FEE2E2` | Error backgrounds |
| `--warning` | `#B45309` | Warnings, expiring items |
| `--warning-light` | `#FEF3C7` | Warning backgrounds |
| `--info` | `#2563EB` | Info badges, links |
| `--info-light` | `#DBEAFE` | Info backgrounds |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--neutral-950` | `#0A0A0A` | Body text |
| `--neutral-800` | `#262626` | Headings |
| `--neutral-600` | `#525252` | Secondary text, labels |
| `--neutral-400` | `#A3A3A3` | Placeholder text, disabled |
| `--neutral-200` | `#E5E5E5` | Borders, dividers |
| `--neutral-100` | `#F5F5F5` | Card backgrounds (light mode) |
| `--neutral-50`  | `#FAFAFA` | Page background |
| `--white`       | `#FFFFFF` | Card surface, inputs |

### Dark Mode Mappings
| Light | Dark Equivalent |
|-------|-----------------|
| Page background `--neutral-50` | `#0A0A0A` |
| Card surface `--white` | `#171717` |
| Card background `--neutral-100` | `#262626` |
| Borders `--neutral-200` | `#404040` |
| Body text `--neutral-950` | `#FAFAFA` |
| Secondary text `--neutral-600` | `#A3A3A3` |
| Primary `--spruce-700` | `#6FCFAC` (lighter for contrast — see the contrast rule below) |

### Contrast rule — enforced, not aspirational

Every colour used for **text** must reach 4.5:1 against the surface behind it. Three tokens failed
this and were corrected once an automated axe scan was added: `--fg-muted` (was `#94A3B8`, 2.6:1),
`--success` (was `#16A34A`, 3.1:1) and `--warning` (was `#D97706`, 3.6:1). Gold `#F4A300` fails
badly at 2.1:1 and is now a **fill-only** colour — links and inline accent text use spruce, which
is what this document said all along while the code used gold.

The same rule applies **in dark mode**, and it must be measured against the *lightest* dark surface
a token is used on — `--surface-raised` `#334155`, not the page background. Nobody had ever checked
this, and two more tokens failed once the scan was extended: dark `--fg-muted` (was `#94A3B8`,
4.03:1 on raised surfaces, now `#A8B4C6`) and dark `--secondary` (was `#4AAE8A`, between 3.5:1 and
4.4:1 as text on the raised surfaces it is actually used on, now `#6FCFAC`).

`tests/e2e/accessibility.spec.ts` scans every public page, and
`tests/e2e/signed-in-accessibility.spec.ts` scans every admin and student page **in both themes**.
Both fail on any serious or critical violation, so this cannot drift back unnoticed.

---

## 2. Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

Load Inter from Google Fonts (weight 400, 500, 600, 700):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Type Scale
| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display` | 48px / 3rem | 700 | 1.1 | Landing page hero headline |
| `h1` | 36px / 2.25rem | 700 | 1.2 | Page titles |
| `h2` | 30px / 1.875rem | 600 | 1.25 | Section headings |
| `h3` | 24px / 1.5rem | 600 | 1.3 | Card titles, subsections |
| `h4` | 20px / 1.25rem | 600 | 1.35 | Feature titles |
| `body-lg` | 18px / 1.125rem | 400 | 1.6 | Hero subheadline, lead text |
| `body` | 16px / 1rem | 400 | 1.6 | Default body text |
| `body-sm` | 14px / 0.875rem | 400 | 1.5 | Table cells, secondary info |
| `caption` | 12px / 0.75rem | 500 | 1.4 | Labels, timestamps, badges |
| `overline` | 12px / 0.75rem | 600 | 1.4 | Section labels, uppercase |

### Tailwind Classes
```
display   → text-5xl font-bold leading-tight
h1        → text-4xl font-bold
h2        → text-3xl font-semibold
h3        → text-2xl font-semibold
h4        → text-xl font-semibold
body-lg   → text-lg
body      → text-base
body-sm   → text-sm
caption   → text-xs font-medium
overline  → text-xs font-semibold uppercase tracking-wider
```

---

## 3. Spacing System

Base unit: **4px**. All spacing uses multiples of 4.

| Token | Value | Tailwind | Common Use |
|-------|-------|----------|------------|
| `xs` | 4px | `p-1` | Icon padding, tight gaps |
| `sm` | 8px | `p-2` | Between related items |
| `md` | 16px | `p-4` | Card padding, section gaps |
| `lg` | 24px | `p-6` | Section padding |
| `xl` | 32px | `p-8` | Page section spacing |
| `2xl` | 48px | `p-12` | Between major sections |
| `3xl` | 64px | `p-16` | Landing page section spacing |
| `4xl` | 96px | `p-24` | Hero section top/bottom |

### Layout
| Property | Value |
|----------|-------|
| Max content width | `max-w-7xl` (1280px) |
| Content padding (desktop) | `px-8` (32px each side) |
| Content padding (mobile) | `px-4` (16px each side) |
| Card border radius | `rounded-xl` (12px) |
| Button border radius | `rounded-lg` (8px) |
| Input border radius | `rounded-md` (6px) |
| Sidebar width | `w-64` (256px) |
| Sidebar collapsed | `w-16` (64px) |

---

## 4. Component Specs

### Buttons
```
Primary:     bg-gold-500 text-spruce-950 hover:bg-gold-600
             font-semibold py-2.5 px-6 rounded-lg
             transition-all duration-200 hover:scale-[1.02]

Secondary:   bg-spruce-700 text-white hover:bg-spruce-600
             font-semibold py-2.5 px-6 rounded-lg

Outline:     border-2 border-spruce-700 text-spruce-700
             hover:bg-spruce-50
             font-semibold py-2.5 px-6 rounded-lg

Ghost:       text-spruce-700 hover:bg-spruce-50
             font-medium py-2.5 px-4 rounded-lg

Destructive: bg-error text-white hover:bg-red-700
             font-semibold py-2.5 px-6 rounded-lg

Disabled:    opacity-50 cursor-not-allowed (on any variant)

Sizes:
  sm → py-1.5 px-3 text-sm
  md → py-2.5 px-6 text-base (default)
  lg → py-3 px-8 text-lg
```

### Cards
```
Default:     bg-white rounded-xl border border-neutral-200
             p-6 shadow-sm
             dark:bg-neutral-900 dark:border-neutral-800

Hover:       hover:shadow-md hover:border-spruce-200
             transition-shadow duration-200

Active/      border-spruce-500 bg-spruce-50
Selected:    dark:border-spruce-400 dark:bg-spruce-950
```

### Status Badges
```
Draft:       bg-neutral-100 text-neutral-600 border border-neutral-200
Published:   bg-success-light text-success border border-green-200
In Review:   bg-info-light text-info border border-blue-200
Rejected:    bg-error-light text-error border border-red-200
Archived:    bg-neutral-100 text-neutral-400 border border-neutral-200
Approved:    bg-success-light text-success
Pending:     bg-warning-light text-warning border border-yellow-200

All badges:  text-xs font-medium px-2.5 py-0.5 rounded-full
```

### Plan Badges
```
Free:        bg-neutral-100 text-neutral-700
Pro:         bg-gold-100 text-gold-600 border border-gold-300
Institution: bg-spruce-100 text-spruce-700 border border-spruce-300
```

### Form Inputs
```
Default:     w-full border border-neutral-200 rounded-md
             px-3 py-2 text-base
             focus:ring-2 focus:ring-spruce-500 focus:border-spruce-500
             placeholder:text-neutral-400

Error:       border-error focus:ring-error
             + error text below in text-sm text-error

Disabled:    bg-neutral-100 cursor-not-allowed opacity-60
```

### Sidebar (Dashboard)
```
Background:  bg-spruce-900 text-white
Item:        py-2.5 px-4 rounded-lg text-sm font-medium
             text-spruce-300 hover:bg-spruce-800 hover:text-white
Active:      bg-spruce-700 text-white
Icon:        w-5 h-5 mr-3 (use lucide-react icons)
Section:     text-xs uppercase tracking-wider text-spruce-500
             mt-6 mb-2 px-4
```

### Tables
```
Header:      bg-neutral-50 text-neutral-600 text-sm font-medium
             uppercase tracking-wider
Row:         border-b border-neutral-100
             hover:bg-neutral-50
Cell:        py-3 px-4 text-sm
Zebra:       even:bg-neutral-50 (optional, not required)
```

### Toast / Notifications
Use shadcn's `<Sonner>` component with these theme overrides:
```
Success:     bg-success text-white
Error:       bg-error text-white
Warning:     bg-warning text-white
Info:        bg-info text-white
```

---

## 5. Quiz Player Design

### Question Card
```
Container:   max-w-2xl mx-auto
Card:        bg-white rounded-xl p-8 shadow-lg border

Question:    text-xl font-semibold text-neutral-950 mb-6

Options:     Grid of 4 option cards, each:
             border border-neutral-200 rounded-lg p-4
             hover:border-spruce-500 hover:bg-spruce-50
             cursor-pointer transition-all

Selected:    border-spruce-700 bg-spruce-50 ring-2 ring-spruce-500

Correct      border-success bg-success-light
(after):

Wrong        border-error bg-error-light
(after):
```

### Timer
```
Container:   fixed top-0 w-full bg-white/80 backdrop-blur
Bar:         h-1 bg-gold-500 transition-all duration-1000
             (width decreases over time)
Text:        text-sm font-mono font-semibold
             text-neutral-600 (normal)
             text-error (< 60 seconds)
             animate-pulse (< 30 seconds)
```

### Progress Bar
```
Container:   h-2 bg-neutral-200 rounded-full
Fill:        bg-spruce-500 rounded-full transition-all
Text:        "Question 5 of 10" text-sm text-neutral-600
```

---

## 6. Landing Page Specific

### Hero Section
```
Background:  bg-white (clean, not dark)
Layout:      grid grid-cols-1 lg:grid-cols-2 gap-12
             items-center py-24 px-8
Left:        headline + subheadline + CTA
Right:       product screenshot in device mockup frame
             shadow-2xl rounded-xl overflow-hidden
```

### Pricing Cards
```
Free:        bg-white border border-neutral-200
Pro:         bg-white border-2 border-gold-500 ring-1 ring-gold-200
             relative (with "Most Popular" badge)
Institution: bg-white border border-neutral-200

Popular      absolute -top-3 left-1/2 -translate-x-1/2
Badge:       bg-gold-500 text-spruce-950 text-xs font-bold
             px-3 py-1 rounded-full
```

### Feature Cards
```
Card:        bg-white rounded-xl p-6 border border-neutral-100
             hover:shadow-md transition-shadow
Icon:        w-12 h-12 bg-spruce-50 rounded-lg
             flex items-center justify-center
             text-spruce-700 (lucide icon inside)
Title:       text-lg font-semibold mt-4
Description: text-sm text-neutral-600 mt-2
```

---

## 7. Icons

Use `lucide-react` for all icons. Consistent size:
- Navigation: `w-5 h-5`
- Feature cards: `w-6 h-6` inside `w-12 h-12` container
- Inline with text: `w-4 h-4`
- Empty states: `w-16 h-16`

Key icons by feature:
| Feature | Icon |
|---------|------|
| Courses | `BookOpen` |
| Students | `Users` |
| Quizzes | `FileQuestion` |
| Analytics | `BarChart3` |
| Settings | `Settings` |
| AI Generation | `Sparkles` |
| Anti-Cheating | `Shield` |
| Certificates | `Award` |
| Timer | `Clock` |
| Dashboard | `LayoutDashboard` |
| Logout | `LogOut` |
| Add/Create | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Approve | `Check` |
| Reject | `X` |
| Copy | `Copy` |
| Download | `Download` |
| Upload | `Upload` |
| Search | `Search` |
| Filter | `Filter` |
| Email | `Mail` |
| Lock | `Lock` |
| Eye/View | `Eye` |
| Score | `Trophy` |
| Warning | `AlertTriangle` |

---

## 8. Responsive Breakpoints

Follow Tailwind defaults:
| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| `sm` | 640px | Large phones landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Layout Rules
- **Mobile (< 768px):** Single column, sidebar hidden (hamburger menu), full-width cards, stacked pricing table
- **Tablet (768px-1024px):** 2-column grid where applicable, collapsible sidebar
- **Desktop (> 1024px):** Full sidebar visible, max-w-7xl content, multi-column grids

---

## 9. Animations (CSS only — no libraries)

```css
/* Fade in on scroll (Intersection Observer) */
.fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Button hover */
.btn-hover {
  transition: all 0.2s ease;
}
.btn-hover:hover {
  transform: scale(1.02);
}

/* Card hover */
.card-hover {
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

/* Skeleton loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

Use Tailwind's built-in classes where possible:
- `transition-all duration-200`
- `hover:scale-[1.02]`
- `hover:shadow-md`
- `animate-pulse` (for loading states)
- `animate-spin` (for spinners)
