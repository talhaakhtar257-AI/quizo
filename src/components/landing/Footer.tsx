import Link from "next/link";
import { Sparkles } from "lucide-react";

// Only real destinations here. Placeholder "#" links (Blog, Help Center,
// Changelog) looked identical to working ones and did nothing when tapped —
// a dead link styled as a live link is worse than no link at all. They come
// back when those pages actually exist.
const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/pricing" },
      { label: "How it works", href: "/#how-it-works" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Create an academy", href: "/signup" },
      { label: "Join with a code", href: "/signup/student" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/privacy#cookies" },
    ],
  },
];

// Fixed dark background regardless of app theme, same reasoning as
// FinalCTA — a footer that stays consistently dark reads as more
// deliberate than one that flips with the toggle.
export function Footer() {
  return (
    <footer className="bg-[#0F2E22] px-4 py-12 text-[#D9F2E8] md:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-white">
            <Sparkles className="size-5 text-secondary" aria-hidden="true" />
            Quizo
          </Link>
          <p className="mt-3 text-sm">AI-powered quiz platform for academies</p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-white">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-xs">
        © {new Date().getFullYear()} Quizo. All rights reserved.
      </div>
    </footer>
  );
}
