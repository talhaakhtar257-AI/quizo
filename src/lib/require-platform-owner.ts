import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export function platformOwnerEmails(): Set<string> {
  const emails = new Set(
    (process.env.PLATFORM_OWNER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  // An unset allowlist locks EVERYONE out of /platform, including the real
  // owner, with nothing but a silent redirect to show for it — which is
  // exactly what happened when this variable was set locally but never added
  // to the deployment. Missing configuration should be loud.
  if (emails.size === 0) {
    console.error(
      "[quizo] PLATFORM_OWNER_EMAILS is not set — the platform-owner area is unreachable for every account. Set it in the deployment's environment variables."
    );
  }

  return emails;
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
