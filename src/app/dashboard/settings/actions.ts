"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { encrypt } from "@/lib/crypto";
import { validateGeminiKey } from "@/lib/gemini";

const academyInfoSchema = z.object({
  name: z.string().trim().min(2, "Academy name must be at least 2 characters").max(100),
  logoUrl: z.union([z.literal(""), z.url("Enter a valid URL")]),
  accentColor: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a hex color like #1B4D3E")]),
});

export async function updateAcademyInfo(formData: FormData) {
  const parsed = academyInfoSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl") ?? "",
    accentColor: formData.get("accentColor") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { supabase, orgId } = await requirePermission("manage_settings");

  const { error: orgError } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, logo_url: parsed.data.logoUrl || null })
    .eq("id", orgId);
  if (orgError) throw new Error("Could not save. Please try again.");

  // Certificate branding (Pro/Institution only — see certificate-pdf.ts),
  // stored separately from organizations since it's presentation, not
  // identity. Free orgs can still set it here; it's just never used on a
  // Free certificate.
  const { error: settingsError } = await supabase
    .from("organization_settings")
    .update({ branding: { accentColor: parsed.data.accentColor || null } })
    .eq("organization_id", orgId);
  if (settingsError) throw new Error("Could not save. Please try again.");

  revalidatePath("/dashboard/settings");
}

const geminiKeySchema = z.object({
  apiKey: z.string().trim().min(10, "That doesn't look like a valid API key"),
});

export async function saveGeminiKey(formData: FormData) {
  const parsed = geminiKeySchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  // Validate with a real, tiny call to Google before ever storing it —
  // docs/API-ROUTES.md: "Validate key with a test API call → encrypt → store".
  const validation = await validateGeminiKey(parsed.data.apiKey);
  if (!validation.valid) throw new Error(validation.reason);

  const { supabase, orgId } = await requirePermission("manage_settings");

  const { error } = await supabase
    .from("organization_settings")
    .update({ gemini_api_key: encrypt(parsed.data.apiKey) })
    .eq("organization_id", orgId);

  if (error) throw new Error("Could not save the key. Please try again.");
  revalidatePath("/dashboard/settings");
}

export async function removeGeminiKey() {
  const { supabase, orgId } = await requirePermission("manage_settings");

  const { error } = await supabase
    .from("organization_settings")
    .update({ gemini_api_key: null })
    .eq("organization_id", orgId);

  if (error) throw new Error("Could not remove the key. Please try again.");
  revalidatePath("/dashboard/settings");
}
