"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui";
import { signOut } from "@/lib/auth";

// Deliberately its own shell, not AdminShell — this is Talha's own control
// panel, not another academy's dashboard, and it has exactly one page, so a
// full sidebar nav would be empty chrome. The secondary/spruce accent (not
// gold) is the one visual cue that this is a different kind of area.
export function PlatformShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-secondary" aria-hidden="true" />
          <span className="text-lg font-bold text-fg">Quizo Platform</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-fg-secondary sm:inline">{userEmail}</span>
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="flex size-10 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
