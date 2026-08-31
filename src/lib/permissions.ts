import { createClient } from "@/lib/supabase/server";
import { PERMISSION_KEYS, PERMISSION_LABELS, type SubAdminPermission } from "@/lib/permission-types";

export { PERMISSION_KEYS, PERMISSION_LABELS, type SubAdminPermission };

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface AuthedContext {
  supabase: Supabase;
  userId: string;
  orgId: string;
  role: string;
}

async function loadContext(): Promise<AuthedContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const isStaff = profile?.role === "admin" || profile?.role === "sub_admin";
  if (!profile || !profile.is_active || !isStaff) {
    throw new Error("Admin access required.");
  }

  return { supabase, userId: user.id, orgId: profile.organization_id, role: profile.role };
}

async function checkPermission(ctx: AuthedContext, permission: SubAdminPermission): Promise<boolean> {
  // The academy owner (role "admin") always has every permission — the
  // matrix only ever restricts a sub_admin.
  if (ctx.role === "admin") return true;
  const { data } = await ctx.supabase
    .from("sub_admin_permissions")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("organization_id", ctx.orgId)
    .maybeSingle();
  return Boolean(data?.[permission]);
}

// Enforced here, never just hidden in the UI — a sub-admin's own browser
// client could otherwise call the same server action directly with the
// button simply never rendered. docs/BUILD-PLAN.md Phase N.
export async function requirePermission(permission: SubAdminPermission): Promise<AuthedContext> {
  const ctx = await loadContext();
  if (!(await checkPermission(ctx, permission))) {
    throw new Error(`Your account does not have permission to: ${PERMISSION_LABELS[permission]}.`);
  }
  return ctx;
}

// A second check inside an action that already called requirePermission
// once — e.g. creating a quiz needs create_quiz, but publishing it
// immediately additionally needs approve_quiz. Reuses the already-resolved
// context instead of re-fetching the profile.
export async function assertPermission(ctx: AuthedContext, permission: SubAdminPermission): Promise<void> {
  if (!(await checkPermission(ctx, permission))) {
    throw new Error(`Your account does not have permission to: ${PERMISSION_LABELS[permission]}.`);
  }
}

// Only the org's founding admin (the literal owner) may invite sub-admins
// or edit the permission matrix — a sub-admin must never be able to grant
// itself, or another sub-admin, more access than it was given, even one
// holding manage_settings.
export async function requireOwner(): Promise<AuthedContext> {
  const ctx = await loadContext();
  if (ctx.role !== "admin") {
    throw new Error("Only the academy owner can manage sub-admins.");
  }
  const { data: org } = await ctx.supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", ctx.orgId)
    .single();
  if (org?.owner_id !== ctx.userId) {
    throw new Error("Only the academy owner can manage sub-admins.");
  }
  return ctx;
}

// For building UI flags in Server Components (hiding nav items, disabling
// buttons) — never throws; a role that shouldn't be here just gets every
// flag false. This is UX polish only, not the security boundary — the
// requirePermission()/requireOwner() checks above are.
export async function getPermissionFlags(): Promise<Record<SubAdminPermission, boolean>> {
  const allFalse = Object.fromEntries(PERMISSION_KEYS.map((p) => [p, false])) as Record<
    SubAdminPermission,
    boolean
  >;
  try {
    const ctx = await loadContext();
    if (ctx.role === "admin") {
      return Object.fromEntries(PERMISSION_KEYS.map((p) => [p, true])) as Record<
        SubAdminPermission,
        boolean
      >;
    }
    const { data } = await ctx.supabase
      .from("sub_admin_permissions")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("organization_id", ctx.orgId)
      .maybeSingle();
    return Object.fromEntries(
      PERMISSION_KEYS.map((p) => [p, Boolean(data?.[p])])
    ) as Record<SubAdminPermission, boolean>;
  } catch {
    return allFalse;
  }
}
