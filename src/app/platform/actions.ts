"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformOwner } from "@/lib/require-platform-owner";

const VALID_PLANS = new Set(["free", "pro", "institution"]);

export async function changeOrgPlan(orgId: string, plan: string) {
  if (!VALID_PLANS.has(plan)) throw new Error("Unknown plan.");
  const { supabase } = await requirePlatformOwner();

  const { error } = await supabase.from("organizations").update({ plan }).eq("id", orgId);
  if (error) throw new Error("Could not change this academy's plan.");

  revalidatePath("/platform");
}

export async function setOrgSuspended(orgId: string, suspended: boolean) {
  const { supabase } = await requirePlatformOwner();

  const { error } = await supabase
    .from("organizations")
    .update({ is_suspended: suspended })
    .eq("id", orgId);
  if (error) throw new Error(`Could not ${suspended ? "suspend" : "unsuspend"} this academy.`);

  revalidatePath("/platform");
}
