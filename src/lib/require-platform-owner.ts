import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function platformOwnerEmails(): Set<string> {
  return new Set(
    (process.env.PLATFORM_OWNER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

// Gated by an env allowlist, never a database role — no combination of row
// values a customer's own account holds can grant this (CLAUDE.md rule #11).
// `src/proxy.ts` already blocks page navigation to /platform for anyone not
// on the list, but a Server Action can be invoked directly, bypassing
// middleware — this is the real boundary, not a redundant check.
//
// Returns the SERVICE-ROLE client rather than the normal session client:
// the entire point of this area is seeing every organization at once, which
// no RLS-scoped client could ever do (by design). Only call this after
// confirming the caller is on the allowlist, which this function itself does
// before ever handing back that bypass.
export async function requirePlatformOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !platformOwnerEmails().has(email)) {
    throw new Error("Platform-owner access required.");
  }
  return { supabase: createServiceClient(), email };
}
