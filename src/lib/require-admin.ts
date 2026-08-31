import { createClient } from "@/lib/supabase/server";

// Admin AND sub_admin both pass this check — it is the basic "you belong in
// the dashboard" gate. Which specific actions a sub_admin may take within
// the dashboard is a separate, finer-grained check against
// sub_admin_permissions (Phase N), not this function's job.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be logged in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminOrSubAdmin = profile?.role === "admin" || profile?.role === "sub_admin";
  if (!profile || !isAdminOrSubAdmin || !profile.is_active) {
    throw new Error("Admin access required.");
  }

  return supabase;
}
