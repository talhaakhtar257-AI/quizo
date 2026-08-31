"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireOwner } from "@/lib/permissions";
import { generateInviteToken } from "@/lib/sub-admin-invite";
import { PERMISSION_KEYS, type SubAdminPermission } from "@/lib/permissions";
import { planLimitError } from "@/lib/plan-limits";
import type { TablesUpdate } from "@/types/database";

const emailSchema = z.email("Enter a valid email address");

async function sendInviteEmail(email: string, token: string): Promise<boolean> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host");
    if (!host) return false;
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const cookie = hdrs.get("cookie");

    const response = await fetch(`${protocol}://${host}/api/send-sub-admin-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ email, token }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function inviteSubAdmin(email: string) {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const normalizedEmail = parsed.data.toLowerCase();

  const { supabase, userId, orgId } = await requireOwner();

  const [{ data: org }, { count: activeCount }, { count: pendingCount }] = await Promise.all([
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase
      .from("sub_admin_permissions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("sub_admin_invites")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  const { data: limits } = await supabase
    .from("plan_limits")
    .select("max_sub_admins")
    .eq("plan", org?.plan ?? "free")
    .single();
  const max = limits?.max_sub_admins ?? 0;

  if (max <= 0) {
    throw planLimitError("Sub-admins are a Pro and Institution feature.");
  }
  if ((activeCount ?? 0) + (pendingCount ?? 0) >= max) {
    throw planLimitError(
      `You've reached your plan's limit of ${max} sub-admin${max === 1 ? "" : "s"}.`
    );
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("email", normalizedEmail)
    .maybeSingle();
  if (existingProfile) throw new Error("This person already has an account in your academy.");

  const token = generateInviteToken();
  const { error } = await supabase.from("sub_admin_invites").insert({
    organization_id: orgId,
    email: normalizedEmail,
    token,
    invited_by: userId,
  });
  if (error) {
    if (error.code === "23505") throw new Error("There's already a pending invite for this email.");
    throw new Error("Could not create the invite. Please try again.");
  }

  revalidatePath("/dashboard/settings");
  const emailSent = await sendInviteEmail(normalizedEmail, token);
  return { emailSent };
}

export async function revokeInvite(inviteId: string) {
  const { supabase, orgId } = await requireOwner();
  const { error } = await supabase
    .from("sub_admin_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("organization_id", orgId);
  if (error) throw new Error("Could not revoke this invite.");
  revalidatePath("/dashboard/settings");
}

export async function updateSubAdminPermission(
  userId: string,
  permission: SubAdminPermission,
  value: boolean
) {
  if (!PERMISSION_KEYS.includes(permission)) throw new Error("Unknown permission.");
  const { supabase, orgId } = await requireOwner();
  const update: TablesUpdate<"sub_admin_permissions"> = { updated_at: new Date().toISOString() };
  update[permission] = value;
  const { error } = await supabase
    .from("sub_admin_permissions")
    .update(update)
    .eq("user_id", userId)
    .eq("organization_id", orgId);
  if (error) throw new Error("Could not update this permission.");
  revalidatePath("/dashboard/settings");
}

export async function removeSubAdmin(userId: string) {
  const { supabase, orgId } = await requireOwner();
  // Deactivate rather than delete — keeps their name attributable on any
  // course/quiz they created, same reasoning as everywhere else in this
  // project a row is kept for history instead of removed.
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId)
    .eq("organization_id", orgId)
    .eq("role", "sub_admin");
  if (error) throw new Error("Could not remove this sub-admin.");
  revalidatePath("/dashboard/settings");
}
