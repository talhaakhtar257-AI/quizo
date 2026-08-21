"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/require-admin";

async function sendApprovalEmail(email: string, name: string | null): Promise<boolean> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host");
    if (!host) return false;
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const cookie = hdrs.get("cookie");

    const response = await fetch(`${protocol}://${host}/api/send-approval-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The route re-checks admin auth itself, but a server-side fetch is
        // a brand new HTTP request — it doesn't inherit the browser's
        // cookies automatically, so they have to be forwarded by hand.
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ email, name }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function approveUser(userId: string) {
  const supabase = await requireAdmin();

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", userId)
    .select("email, full_name")
    .single();

  if (error || !profile) {
    throw new Error(error?.message ?? "Could not approve this user.");
  }

  revalidatePath("/admin/users");

  const emailSent = profile.email ? await sendApprovalEmail(profile.email, profile.full_name) : false;
  return { emailSent };
}

export async function bulkApprove(userIds: string[]) {
  const supabase = await requireAdmin();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .in("id", userIds)
    .select("email, full_name");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");

  let emailFailures = 0;
  for (const profile of profiles ?? []) {
    const sent = profile.email ? await sendApprovalEmail(profile.email, profile.full_name) : false;
    if (!sent) emailFailures += 1;
  }

  return { approvedCount: profiles?.length ?? 0, emailFailures };
}

export async function rejectUser(userId: string, reason: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "rejected", rejection_reason: reason.trim() || null })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function moveToPending(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "pending", rejection_reason: null })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function deactivateUser(userId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ status: "rejected", rejection_reason: "Deactivated by admin" })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}
