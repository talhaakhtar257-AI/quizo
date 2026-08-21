import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export interface CurrentUser {
  id: string;
  email: string;
  profile: Tables<"profiles">;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return { id: user.id, email: user.email ?? profile.email ?? "", profile };
}
