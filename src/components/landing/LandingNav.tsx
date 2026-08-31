"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Menu, X } from "lucide-react";
import { Button } from "@/components/ui";

const links = [
  { href: "#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

// Sticky nav with a translucent blur backdrop per docs/LANDING-PAGE.md.
// Mobile collapses to a hamburger that slides in a full-width drawer.
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-secondary">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          Quizo
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-fg-secondary hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-fg-secondary hover:text-fg">
            Login
          </Link>
          <Link href="/signup">
            <Button size="sm">Start Free →</Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-md text-fg md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-fg-secondary"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="text-sm font-medium text-fg-secondary"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)}>
              <Button className="w-full">Start Free →</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
