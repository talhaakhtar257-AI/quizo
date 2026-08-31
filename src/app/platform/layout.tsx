import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { PlatformShell } from "@/components/platform/PlatformShell";

function platformOwnerEmails(): Set<string> {
  return new Set(
    (process.env.PLATFORM_OWNER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

// `src/proxy.ts` already redirects anyone off the allowlist before a page
// here ever renders — this is the Server Component's own re-check, same
// belt-and-suspenders pattern as dashboard/layout.tsx re-checking
// getCurrentUser() even though proxy.ts already gates /dashboard.
export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();

  if (!email || !platformOwnerEmails().has(email)) redirect("/");

  return <PlatformShell userEmail={email}>{children}</PlatformShell>;
}
