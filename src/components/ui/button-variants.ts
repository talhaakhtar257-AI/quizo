import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// Primary = gold, the CTA color (docs/DESIGN-SYSTEM.md §4). Gold is light
// in both themes, so its text is always the fixed --color-on-primary,
// never --fg.
//
// "secondary" stays the existing NEUTRAL low-emphasis style on purpose —
// every one of its 16 call sites in the dashboard is a Cancel/Back button
// sitting right next to a primary Save/Submit button. The design doc's
// solid-spruce "Secondary" button is a marketing-page style (a second CTA
// next to the gold one), not a low-emphasis one — using it here would put
// two equally loud, differently-coloured buttons side by side and break
// the "which one do I click" hierarchy those screens rely on. The new
// "outline" variant covers the spruce-brand look for marketing pages
// instead, spruce text/ghost covers the low-emphasis brand-tinted case.
const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "bg-surface text-fg border border-border hover:bg-surface-raised",
  outline: "border-2 border-secondary text-secondary hover:bg-secondary-faint",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "bg-transparent text-fg hover:bg-surface-raised",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-6 text-base",
};

// Plain function, no "use client" — safe to call from Server Components too.
// Shared with any element that needs to look like a Button without being one
// (e.g. a <Link> that navigates instead of submitting/clicking).
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}
