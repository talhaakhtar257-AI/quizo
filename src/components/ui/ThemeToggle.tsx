"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme is unknown on the server, so render a same-sized placeholder
  // until mounted to avoid a hydration mismatch / layout jump.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="h-[52px] w-[152px] rounded-md bg-surface-raised"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            theme === value && "bg-primary-subtle text-secondary"
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
